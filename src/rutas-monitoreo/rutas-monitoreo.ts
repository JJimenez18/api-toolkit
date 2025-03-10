/* eslint-disable @typescript-eslint/ban-types */
import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import { ValidadorErroresParametros } from '../middlewares/validador-errores-parametros';
import { ControladorMonitoreo } from './controlador-monitoreo';
import { ValidadorRutasMonitoreo } from './validadores-rutas-monitoreo';
import { LoggerS3 } from '../middlewares/logger.s3';

export class RutasMonitoreo {
  private readonly logger = LoggerS3.getInstance().getLogger();
  private static instance: RutasMonitoreo;

  private callbackFunction:Function = () => this.logger.info('La función monitoreo disponible no tiene implementación');

  private callbackDisconnectFunction: Function = () => this.logger
    .info('La función monitoreo desconectar no tiene implementación');

  // eslint-disable-next-line no-useless-constructor, @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): RutasMonitoreo {
    if (!this.instance) {
      this.instance = new RutasMonitoreo();
    }
    return this.instance;
  }

  inicializar = (router: express.Router): void => {
    const validador = new ValidadorRutasMonitoreo();
    const controladorMonitoreo = new ControladorMonitoreo();
    router.get('/monitoreo/telnet',
      validador.telnet(),
      ValidadorErroresParametros.validar,
      controladorMonitoreo.monitoreoTelnet);

    router.get('/monitoreo/ping',
      validador.ping(),
      ValidadorErroresParametros.validar,
      controladorMonitoreo.monitoreoPing);

    router.get('/monitoreo/vivo',
      controladorMonitoreo.monitoreoVivo);
    
    router.get('/status',
        controladorMonitoreo.monitoreoVivo);

    router.get('/monitoreo/disponible',
      async (solicitud: Request, respuesta: Response, siguienteMiddleware: NextFunction) => {
        await this.callbackFunction(solicitud, respuesta, siguienteMiddleware);
      });

    router.get('/monitoreo/desconectar',
      async (solicitud: Request, respuesta: Response, siguienteMiddleware: NextFunction) => {
        await this.callbackDisconnectFunction(solicitud, respuesta, siguienteMiddleware);
      });
  }

  monitoreoDisponible = async (
    callback: (req: Request, res: Response, next: NextFunction) => Promise<Response<any>>,
  ):Promise<void> => {
    this.logger.info('Función de monitoreo disponible implementada');
    this.callbackFunction = callback;
  }

  monitoreoDesconectar = async (
    callback: (req: Request, res: Response, next: NextFunction) => Promise<Response<any>>,
  ):Promise<void> => {
    this.logger.info('Función de monitoreo desconexion de BD implementada');
    this.callbackDisconnectFunction = callback;
  }
}
