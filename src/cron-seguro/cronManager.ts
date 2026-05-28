import cron from 'node-cron';
import { LockService } from './lock.service';
import { LoggerS3 } from '../middlewares';

export class CronManager {
    private static logger = LoggerS3.getInstance().getLogger();
    /**
     * Crea un Job que respeta el bloqueo distribuido
     * @param nombreProceso ID único para DocumentDB
     * @param schedule Expresión cron (ej: '0 * * * *')
     * @param task Función asíncrona a ejecutar
     */
    static crearJobSeguro(nombreProceso: string, schedule: string, task: () => Promise<void>) {
        const lock = LockService.getInstance();

        cron.schedule(schedule, async () => {
            CronManager.logger.info(`[Cron] Intentando ejecutar: ${nombreProceso}`);

            const puedoEjecutar = await lock.intentarBloqueo(nombreProceso);

            if (puedoEjecutar) {
                try {
                    CronManager.logger.info(`[Cron] Bloqueo obtenido. Iniciando: ${nombreProceso}`);
                    await task();
                    await lock.liberarBloqueo(nombreProceso);
                    CronManager.logger.info(`[Cron] Finalizado con éxito: ${nombreProceso}`);
                } catch (error: any) {
                    console.error(`[Cron] Error en ${nombreProceso}:`, error);
                    await lock.liberarBloqueo(nombreProceso, error.message);
                }
            } else {
                CronManager.logger.info(`[Cron] ${nombreProceso} ya está en ejecución en otra instancia. Omitiendo.`);
            }
        });
    }
}