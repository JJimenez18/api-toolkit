/* eslint-disable max-len */
import {
  DetallesEntrada, ErrorApi, IDetallesError,
} from './error-api';

export interface IOpcionesErrorServicioNoDisponible {
  /** Error interno = 1000 */
  desconocido: IDetallesError;
  /** Error interno = 1001 */
  sinConexionBD: IDetallesError;
  /** Error interno = 1002 */
  sinConexionExterna: IDetallesError;
}

export const objErrorServicioNoDisponible = (externo: number, mensaje: string): IOpcionesErrorServicioNoDisponible => ({
  desconocido: (detalles: DetallesEntrada, codigoInterno?: number) => new ErrorApi(externo, codigoInterno || 1000, mensaje, detalles),
  sinConexionBD: (detalles: DetallesEntrada, codigoInterno?: number) => new ErrorApi(externo, codigoInterno || 1001, mensaje, detalles),
  sinConexionExterna: (detalles: DetallesEntrada, codigoInterno?: number) => new ErrorApi(externo, codigoInterno || 1002, mensaje, detalles),
});
