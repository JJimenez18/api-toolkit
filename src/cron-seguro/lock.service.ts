import { LoggerS3 } from "../middlewares";
import { ProcesoControl } from "./proceso.model";

export class LockService {
  private static instance: LockService;

  public static getInstance(): LockService {
    if (!LockService.instance) LockService.instance = new LockService();
    return LockService.instance;
  }

  async intentarBloqueo(
    idProceso: string,
    tiempoDeBloqueo = 5
  ): Promise<boolean> {
    const CINCO_MINUTOS = tiempoDeBloqueo * 60 * 1000;
    const fechaLimite = new Date(Date.now() - CINCO_MINUTOS);

    // 1. PASO CRÍTICO: Asegurar que el registro base existe.
    // Usamos updateOne con upsert para que solo exista UN documento para este proceso.
    await ProcesoControl.updateOne(
      { idProceso: idProceso },
      { $setOnInsert: { estado: "IDLE", inicio_ejecucion: new Date(0) } },
      { upsert: true }
    );

    // 2. Intentar "Atrapar" el documento único si está libre o expirado
    const filtro = {
      idProceso: idProceso,
      $or: [{ estado: "IDLE" }, { inicio_ejecucion: { $lt: fechaLimite } }],
    };

    const actualizacion = {
      $set: {
        estado: "BUSY",
        inicio_ejecucion: new Date(), // Actualizamos a "ahora"
        instancia_id: process.env.ECS_TASK_ID || "local-dev",
      },
    };

    // Intentamos el cambio atómico
    const resultado = await ProcesoControl.findOneAndUpdate(
      filtro,
      actualizacion,
      {
        new: true,
        upsert: false, // IMPORTANTE: No crear uno nuevo si está BUSY
      }
    ).lean();

    LoggerS3.getInstance()
      .getLogger()
      .info(`Intentando bloqueo para ${idProceso}. ¿Éxito?: ${!!resultado}`);

    return !!resultado;
  }

  async liberarBloqueo(
    idProceso: string,
    error: string | null = null
  ): Promise<void> {
    await ProcesoControl.updateOne(
      { idProceso },
      {
        $set: {
          estado: "IDLE",
          fin_ejecucion: new Date(),
          ultimo_error: error,
        },
      }
    );
  }
}
