/* eslint-disable linebreak-style */
import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
// import { ErrorApi } from '../respuestas-api';
import { ErrorApi, errorApi } from '../respuestas';
import { LoggerS3 } from './logger.s3';
// import { ErrorServidor, ErrorServidorCodigos } from '../respuestas-api/errores/error-interno-servidor';

export class RutaError {
  private readonly logger = LoggerS3.getInstance().getLogger();
  private static instance: RutaError;

  private error500 = 'Error interno del servidor';

  // eslint-disable-next-line no-useless-constructor, @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): RutaError {
    if (!this.instance) {
      this.instance = new RutaError();
    }
    return this.instance;
  }

  inicializar = (router: express.Router): void => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    router.use((error: Error, solicitud: Request, respuesta: Response, siguienteMiddleware: NextFunction) => {
      if (error instanceof ErrorApi) {
        const err = error as ErrorApi;
        return err.responder(respuesta);
      }
      this.logger.error('Error interno del servidor: ', error.message);
      this.logger.debug(`${JSON.stringify(error.stack)}`);
      return errorApi.errorInternoServidor.desconocido(this.error500).responder(respuesta);
    });
  }

  setMensajeError500 = (error: string):void => {
    this.error500 = error;
  }
}
