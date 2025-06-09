import { Response } from 'express';
import { Utilerias } from '../utilerias/utilerias';
import { LoggerS3 } from '../middlewares/logger.s3';
import { EMensajesError } from '../enum/enums';

export interface IRespApi {
  mensaje: string;
  folio: string;
  resultado?: unknown;
}

export interface IOpcionesExito {
  exito: (respuesta: Response, objetoRespuesta?: unknown) => Response<IRespApi>;
  creado: (respuesta: Response, objetoRespuesta?: unknown) => Response<IRespApi>;
  sinContenido: (respuesta: Response, mensaje?: string, codigoInterno?: number) => Response<IRespApi>;
}

const respuestaNoContent = (respuesta: Response,  mensaje: string, codigoInterno: number): Response<IRespApi> => {
  const codigo = 204;   
  const xCodigo = `${codigo}.${process.env.API_NOMBRE}.${codigoInterno}`;
  respuesta.setHeader('x-codigo', xCodigo);
  respuesta.setHeader('x-mensaje', 'Operación Exitosa, no se encontró información.');
  respuesta.setHeader('x-folio', Utilerias.generarFolio());
  respuesta.setHeader('x-info', `https://baz-developer.bancoazteca.com.mx/info#${codigo}.${process.env.API_NOMBRE}.20400`);
  respuesta.setHeader('x-detalle', mensaje);
  return respuesta.status(204).send();
};

const generarRespuesta = (
  respuesta: Response, codigo: number, objetoRespuesta?: unknown,
): Response<IRespApi> => {
  const data: IRespApi = {
    mensaje: 'Operación exitosa',
    folio: Utilerias.generarFolio(),
  };
  const tiempoTotal = Utilerias.calcularTiempoEjecucion({ inicio: Number(respuesta?.locals?.tiempoTotal || 0) });
  if (objetoRespuesta) {
    if (!Array.isArray(objetoRespuesta) && Utilerias.objetoSinArrays(objetoRespuesta)) {
      const objPintar = Utilerias.processObject(objetoRespuesta);
      LoggerS3.getInstance().getLogger().info(`Respuesta codigo ${codigo} ${tiempoTotal ? `tiempo ${tiempoTotal} ms` : undefined} ${JSON.stringify(objPintar)}`);
    } else {
      LoggerS3.getInstance().getLogger().info(`Respuesta codigo ${codigo} ${tiempoTotal ? `tiempo ${tiempoTotal} ms` : undefined}`);
    }
    data.resultado = objetoRespuesta;
  } else {
    LoggerS3.getInstance().getLogger().info(`Respuesta codigo ${codigo} ${tiempoTotal ? `tiempo ${tiempoTotal} ms` : undefined}`);
  }
  return respuesta.status(codigo).send(data);
};

export const exitoApi: IOpcionesExito = {
  exito: (respuesta: Response, objetoRespuesta?: unknown) => generarRespuesta(respuesta, 200, objetoRespuesta),
  creado: (respuesta: Response, objetoRespuesta?: unknown) => generarRespuesta(respuesta, 201, objetoRespuesta),
  sinContenido: (respuesta: Response, mensaje?: string, codigoInterno?: number) => respuestaNoContent(respuesta, mensaje || EMensajesError.NOT_FOUND, codigoInterno || 204000),
};
