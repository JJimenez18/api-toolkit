/* eslint-disable max-len */
import { VariablesEntorno } from '../../utilerias';
import {
  DetallesEntrada, ErrorApi, ITransformador, IDetallesError,
} from './error-api';

export interface IOpcionesErrorConflictoEstado {
  /** Error interno = 1000 */
  desconocido: IDetallesError;
}

export const objErrorConflictoEstado = (externo: number, mensaje: string): IOpcionesErrorConflictoEstado => ({
  desconocido: (detalles: DetallesEntrada, codigoInterno?: number, apiName?: string, transformador?: ITransformador) => new ErrorApi(externo, codigoInterno || 1000, mensaje, detalles, apiName || VariablesEntorno.API_NOMBRE, transformador),
});
