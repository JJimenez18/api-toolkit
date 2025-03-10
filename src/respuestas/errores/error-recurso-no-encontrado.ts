/* eslint-disable max-len */
import {
  DetallesEntrada, ErrorApi, IDetallesError, ITransformador,
} from './error-api';

export interface IOpcionesErrorRecursoNoEncontrado {
  /** Error interno = 1000 */
  desconocido: IDetallesError;
  /** Error interno = 1001 */
  rutaNoValida: IDetallesError;
  /** Error interno = 1002 */
  recursoNoEncontrado: IDetallesError;
  /** Error interno = 1003 */
  recursoBDNoEncontrado: IDetallesError;
}

export const objErrorRecursoNoEncontrado = (externo: number, mensaje: string): IOpcionesErrorRecursoNoEncontrado => ({
  desconocido: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1000, mensaje, detalles, transformador),
  rutaNoValida: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1001, mensaje, detalles, transformador),
  recursoNoEncontrado: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1002, mensaje, detalles, transformador),
  recursoBDNoEncontrado: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1003, mensaje, detalles, transformador),

  /* desconocido: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1000, mensaje, detalles, transformador),
  rutaNoValida: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1001, mensaje, detalles, transformador),
  recursoNoEncontrado: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1002, mensaje, detalles, transformador),
  recursoBDNoEncontrado: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1004, mensaje, detalles, transformador), */
});
