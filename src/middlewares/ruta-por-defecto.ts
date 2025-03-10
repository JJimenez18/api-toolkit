/* eslint-disable linebreak-style */
import express, { Request, Response } from 'express';
import { errorApi } from '../respuestas/errores/errores-api';
import { LoggerS3 } from './logger.s3';
/* import {
  ErrorRecursoNoEncontrado,
  ErrorRecursoNoEncontradoCodigos,
} from '../respuestas-api/errores/error-recurso-no-encontrado'; */

export class RutaPorDefecto {
  private readonly logger = LoggerS3.getInstance().getLogger();
  private static instance: RutaPorDefecto;

  // eslint-disable-next-line no-useless-constructor, @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): RutaPorDefecto {
    if (!this.instance) {
      this.instance = new RutaPorDefecto();
    }
    return this.instance;
  }

  inicializar = (router: express.Router): void => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    router.all('*', async (solicitud: Request, respuesta: Response) => {
      const obj = {
        baseUrl: solicitud.baseUrl,
        ip: solicitud.ip,
        ips: solicitud.ips,
        method: solicitud.method,
        originalUrl: solicitud.originalUrl,
        path: solicitud.path,
        url: solicitud.url,
        body: solicitud.body,
        params: solicitud.params,
        query: solicitud.query,
        xhr: solicitud.xhr,
        headers: solicitud.headers,
        hostname: solicitud.hostname,
        stale: solicitud.stale,
        cookies: solicitud.cookies,
        signedCookies: solicitud.signedCookies,
      };
      this.logger.info(`Recurso no encontrado: ${JSON.stringify(obj)}`);
      return errorApi.recursoNoEncontrado.rutaNoValida('Ruta y/o verbo no permitido').responder(respuesta);
    });
  }
}
