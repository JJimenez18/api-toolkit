/* eslint-disable max-len */
import {
  DetallesEntrada, ErrorApi, ITransformador, IDetallesError,
} from './error-api';

export interface IOpcionesErrorPeticionNoValida {
  /**
   * Error interno = 1000
   */
  desconocido: IDetallesError;
  /**
   * Error interno = 1001
   */
  tokenNoEncontrado: IDetallesError;
  /**
   * Error interno = 1002
   */
  tokenNoValido: IDetallesError;
  /**
   * Error interno = 1003
   */
  faltanParametros: IDetallesError;
  /**
   * Error interno = 1004
   */
  parametrosNoValidos: IDetallesError;
  /**
     * Error interno = 1005
     */
  peticionNoAutorizada: IDetallesError;
  /**
     * Error interno = 1006
     */
   peticionInvalida: IDetallesError;
}

export const objErrorPeticionNoValida = (externo: number, mensaje: string): IOpcionesErrorPeticionNoValida => ({
  /* desconocido: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1000, mensaje, detalles, transformador),
  tokenNoEncontrado: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1001, mensaje, detalles, transformador),
  tokenNoValido: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1002, mensaje, detalles, transformador),
  faltanParametros: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1003, mensaje, detalles, transformador),
  parametrosNoValidos: (detalles: DetallesEntrada, transformador?: ITransformador) => new ErrorApi(externo, 1004, mensaje, detalles, transformador), */
  desconocido: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1000, mensaje, detalles, transformador),
  tokenNoEncontrado: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1001, mensaje, detalles, transformador),
  tokenNoValido: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1002, mensaje, detalles, transformador),
  faltanParametros: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1003, mensaje, detalles, transformador),
  parametrosNoValidos: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1004, mensaje, detalles, transformador),
  peticionNoAutorizada: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1005, mensaje, detalles, transformador),
  peticionInvalida: (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1006, mensaje, detalles, transformador),
});
