/* eslint-disable max-len */
import {
  DetallesEntrada, ErrorApi, ITransformador, IDetallesError,
} from './error-api';

export interface IOpcionesErrorInternoServidor {
  /** Error interno = 1000 */
  desconocido: IDetallesError;
  /** Error interno = 1001 */
  bd: IDetallesError;
}

export const objErrorInternoServidor = (externo: number, mensaje: string): IOpcionesErrorInternoServidor => ({

  desconocido: (detalles: DetallesEntrada, errorInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, errorInterno || 1000, mensaje, detalles, transformador),
  bd: (detalles: DetallesEntrada, errorInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, errorInterno || 1001, mensaje, detalles, transformador),

  /* desconocido: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1000, mensaje, detalles, transformador),
  bd: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1001, mensaje, detalles, transformador), */

});
