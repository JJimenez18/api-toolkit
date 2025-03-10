/* eslint-disable max-len */
import { Response } from 'express';
import { VariablesEntorno } from '../../utilerias/variables-entorno';
import { Utilerias } from '../../utilerias/utilerias';
import { LoggerS3 } from '../../middlewares/logger.s3';

/* interface IDetallesError {
  mensaje: string;
} */

export type ITransformador = (codigoHttp: number, codigoInterno: number, mensaje: string, detalles: unknown) => unknown;

export type DetallesEntrada = string | string[];

/**
 * Transformador es una función que se ejecuta al momento que contruir la respuesta
 * con la finalidad de darle un formato específico al objeto 'detalles'
 */
// eslint-disable-next-line max-len
export type IDetallesError = (detalles: DetallesEntrada, codigoInterno?: number, transformador?: ITransformador) => ErrorApi;

export class ErrorApi extends Error {
  // private detalles: string[] = [];

  constructor(
    private codigoHttp: number,

    private errorInterno: number,

    private mensaje: string,

    // private detallesGeneral: string | string[],

    private detalles: DetallesEntrada,

    private transformador?: ITransformador,
  ) {
    super('');
    // this.detalles = this.convertirDetalles(detallesGeneral);
    Object.setPrototypeOf(this, ErrorApi.prototype);
  }

  public getCodigoHttp = (): number => this.codigoHttp;

  public getCodigoInterno = (): number => this.errorInterno;

  public getMensaje = (): string => this.mensaje;

  public getDetalles = (): string | string[] => this.detalles;

  // public getDetalles = (): IDetallesError[] => this.detalles;

  private convertirDetalles = (): string[] => {
    if (typeof this.detalles === 'string') {
      return [this.detalles];
    }
    return this.detalles;
    // return detalles.map((detalle) => ({ mensaje: detalle }));
  }

  // public responder = (respuesta: Response): Response<unknown> => RespuestaErrorApi.responder(
  //   respuesta, this.getCodigoHttp(), this.codigoInterno, this.mensaje, this.detalles,
  // );
  public responder = (respuesta: Response): Response<unknown> => {
    const codigoError = `${this.codigoHttp}.${VariablesEntorno.API_NOMBRE}.${this.errorInterno}`;
    const respuestaApi = {
      codigo: codigoError,
      mensaje: this.mensaje,
      folio: Utilerias.generarFolio(),
      info: `${codigoError}`,
      detalles: this.transformador ? this.transformador(
        this.codigoHttp, this.errorInterno, this.mensaje, this.detalles,
      ) : this.convertirDetalles(),
    };
    const tiempoTotal = Utilerias.calcularTiempoEjecucion({ inicio: Number(respuesta?.locals?.tiempoTotal || 0) });
    LoggerS3.getInstance().getLogger().info(`Salida servicio codigo: ${codigoError} ${tiempoTotal ? `tiempo ${tiempoTotal} ms` : undefined} detalles: ${Array.isArray(respuestaApi.detalles) ? respuestaApi?.detalles?.toString() : respuestaApi.detalles}`);
    return respuesta.status(this.codigoHttp).send(respuestaApi);
  }
}
