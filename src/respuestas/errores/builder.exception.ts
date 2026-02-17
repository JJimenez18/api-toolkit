import { EMensajesError } from "../../enum";
import { errorApi } from "./errores-api";

export interface IInputExcepcion {
  mensaje?: string;
  codigoInterno?: number;
  nombreAPI?: string;
  // detalles?: unknown;
}

export class Excepcion {
  static ejecutar(status: number, input: IInputExcepcion = {}): never {
    const { mensaje, codigoInterno, nombreAPI } = input;

    switch (status) {
      case 400:
        throw errorApi.peticionNoValida.parametrosNoValidos(
          mensaje || "Petición no válida",
          codigoInterno,
          nombreAPI
        );

      case 401:
        throw errorApi.peticionNoAutorizada.peticionNoAutorizada(
          mensaje || EMensajesError.NOT_AUTH,
          codigoInterno,
          nombreAPI
        );

      case 403:
        throw errorApi.peticionInvalida.parametrosNoValidos(
          mensaje || "Acceso prohibido",
          codigoInterno,
          nombreAPI
        );

      case 404:
        throw errorApi.recursoNoEncontrado.recursoBDNoEncontrado(
          mensaje || "Recurso no encontrado",
          codigoInterno,
          nombreAPI
        );

      case 409:
        throw errorApi.conflictoEstado.desconocido(
          mensaje || "Conflicto en la petición",
          codigoInterno,
          nombreAPI
        );

      case 503:
        throw errorApi.servicioNoDisponible.sinConexionBD(
          mensaje || "Servicio no disponible",
          codigoInterno,
          nombreAPI
        );

      case 500:
      default:
        throw errorApi.errorInternoServidor.bd(
          mensaje || EMensajesError.ERROR,
          codigoInterno,
          nombreAPI
        );
    }
  }
}
