/* eslint-disable linebreak-style */
import { Response } from 'express';
import { Utilerias } from '../../utilerias/utilerias';

export enum RespuestaExitoApiCodigos {
  EXITO=200,
  RECURSO_CREADO=201,
}

export class RespuestaExitoApi {
  static generar = (
    respuesta: Response, tipoExito: RespuestaExitoApiCodigos, objetoRespuesta: unknown,
  ): Response<unknown> => respuesta
    .status(tipoExito.valueOf())
    .send({
      mensaje: 'Operación exitosa',
      folio: Utilerias.generarFolio(),
      resultado: objetoRespuesta,
    });
}
