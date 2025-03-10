import { NextFunction, Request, Response } from 'express';
// import jwt from 'jsonwebtoken';
export class ValidadorToken {

  static validar = (solicitud: Request, respuesta: Response, siguienteMiddleware: NextFunction):void => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const auth = solicitud.headers.authorization;
    // ValidadorToken.logger.info('Validando token');
    siguienteMiddleware();
  }
}
