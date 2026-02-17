import { Response } from "express";
import { LoggerS3 } from "../../middlewares";
import { Utilerias } from "../../utilerias";
import { AbstractConfiguration } from "../../aws";

export class BuilderError extends Error {
  private codigoInterno: number = 1010;
  private apiName: string = AbstractConfiguration.API_NOMBRE || "API-GENERICO";
  private detalles: string | string[] | null = null;

  private constructor(private httpStatus: number, mensaje: string) {
    super(mensaje);
    Object.setPrototypeOf(this, BuilderError.prototype);
  }

  static peticionNoValida(mensaje: string): BuilderError {
    return new BuilderError(400, mensaje);
  }

  static noAutorizado(mensaje: string): BuilderError {
    return new BuilderError(401, mensaje);
  }

  static prohibido(mensaje: string): BuilderError {
    return new BuilderError(403, mensaje);
  }

  static recursoNoEncontrado(mensaje: string): BuilderError {
    return new BuilderError(404, mensaje);
  }

  static conflicto(mensaje: string): BuilderError {
    return new BuilderError(409, mensaje);
  }

  static interno(mensaje: string): BuilderError {
    return new BuilderError(500, mensaje);
  }

  static servicioNoDisponible(mensaje: string): BuilderError {
    return new BuilderError(503, mensaje);
  }

  public setCodigoInterno(codigo: number): this {
    this.codigoInterno = codigo;
    return this;
  }

  public setApiName(nombre: string): this {
    if (nombre) this.apiName = nombre;
    return this;
  }

  public setDetalles(detalles: string | string[]): this {
    this.detalles = detalles;
    return this;
  }

  public responder(res: Response): Response {
    const codigoError = `${this.httpStatus}.${this.apiName}.${this.codigoInterno}`;

    const respuestaApi = {
      codigo: codigoError,
      mensaje: this.message,
      folio: Utilerias.generarFolio(),
      // info: `Error: ${codigoError}`,
      detalles: this.detalles || [],
    };

    LoggerS3.getInstance()
      .getLogger()
      .error(`[${codigoError}] ${this.message}`);
    return res.status(this.httpStatus).json(respuestaApi);
  }
}