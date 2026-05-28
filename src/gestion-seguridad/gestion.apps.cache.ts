import { Model } from "mongoose";
import NodeCache from "node-cache";
import { SistemasEnum } from "../enum";
import { LoggerS3 } from "../middlewares";
import { IDetalleServicio } from "../models";
import { calcularTiempoEjecucion } from "../utilerias";

export interface ILLaveClienteRegistradas {
  aplicacion: string;
  llaveAes: string;
  llaveHash: string;
  usuarioRegistra: string;
  fechaRegistro: Date;
  estatus: number;
}

export class GestionAppsCache {
  private static instance: GestionAppsCache;
  private readonly logger = LoggerS3.getInstance().getLogger();
  private constructor() {}
  static getInstance(): GestionAppsCache {
    if (!this.instance) {
      this.instance = new GestionAppsCache();
    }
    return this.instance;
  }

  public inicializarCache = async (input: {
    cache: NodeCache;
    CACHE_KEY_MASTER: string;
    model: Model<any>;
  }): Promise<void> => {
    const { cache, CACHE_KEY_MASTER, model } = input;
    this.logger.info(`[Cache] Iniciando cache de ${CACHE_KEY_MASTER}`);
    const inicioConsulta = performance.now();
    const detalleEjecucion: IDetalleServicio[] = [
      {
        servicio: "find_all_cache",
        sistema: SistemasEnum[SistemasEnum.DOCUMENT],
        tiempo: 0,
      },
    ];

    try {
      const llavesCliente = await model
        .find({
          estatus: 1,
        })
        .read("secondary")
        .lean();

      detalleEjecucion[0].tiempo = calcularTiempoEjecucion({
        inicio: inicioConsulta,
        final: performance.now(),
      });

      if (llavesCliente && llavesCliente.length > 0) {
        cache.set(CACHE_KEY_MASTER, llavesCliente);
        this.logger.info(
          `[Cache] Maestro actualizado desde MongoDB, se encontraron ${llavesCliente.length} llaves`,
          detalleEjecucion
        );
      } else {
        this.logger.info(
          `[Cache] Maestro actualizado desde MongoDB, no se encontraron llaves`,
          detalleEjecucion
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[Cache] Error al refrescar maestro: ${error?.message}`
      );
    }
  };

  public iniciarAutoRefreshCache = async (input: {
    cache: NodeCache;
    CACHE_KEY_MASTER: string;
    model: Model<any>;
    CACHE_REFRESH_INTERVAL_MS: number;
  }): Promise<void> => {
    const { cache, CACHE_KEY_MASTER, model, CACHE_REFRESH_INTERVAL_MS } = input;
    this.logger.info(
      `[Cache] Iniciando refresco automático de ${CACHE_KEY_MASTER}`
    );
    await this.inicializarCache({ cache, CACHE_KEY_MASTER, model });
    this.logger.info(
      `[Cache] Refresco automático de ${CACHE_KEY_MASTER} iniciado`
    );
    setInterval(async () => {
      this.logger.debug(
        `[Cache] Ejecutando refresco programado de ${CACHE_KEY_MASTER} (${CACHE_REFRESH_INTERVAL_MS}ms)...`
      );
      await this.inicializarCache({ cache, CACHE_KEY_MASTER, model });
    }, CACHE_REFRESH_INTERVAL_MS);
  };

  public obtenerDevAPPCache = async (input: {
    cache: NodeCache;
    CACHE_KEY_MASTER: string;
    model: Model<any>;
    aplicacionCliente: string;
  }): Promise<ILLaveClienteRegistradas | null> => {
    const { cache, CACHE_KEY_MASTER, model, aplicacionCliente } = input;

    let llavesCliente: ILLaveClienteRegistradas[] =
      cache.get(CACHE_KEY_MASTER) || [];

    if (llavesCliente.length === 0) {
      this.logger.debug("[Cache] Vacío. Consultando MongoDB...");
      try {
        llavesCliente = await model
          .find({ estatus: 1 })
          .read("secondary")
          .lean();
        if (llavesCliente.length > 0) {
          cache.set(CACHE_KEY_MASTER, llavesCliente);
        }
      } catch (error: any) {
        this.logger.error(`[Cache] Fallo fallback MongoDB: ${error?.message}`);
      }
    }

    let resultado = llavesCliente.find(
      (l) => l.aplicacion === aplicacionCliente
    );

    if (!resultado) {
      resultado = await model
        .findOne({
          aplicacion: aplicacionCliente,
          estatus: 1,
        })
        .read("secondary")
        .lean();
      if (resultado) {
        this.logger.debug(`[BD] app ${aplicacionCliente} encontrada en BD`);
      }else{
        this.logger.info(`El app: ${aplicacionCliente}, no se encontró, se requiere registro previo.`)
      }
    } else {
      this.logger.info(`[Cache] App encontrado: ${aplicacionCliente}`);
    }

    return resultado || null;
  };
}
