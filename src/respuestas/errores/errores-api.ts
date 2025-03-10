/* eslint-disable max-len */
import { IOpcionesErrorInternoServidor, objErrorInternoServidor } from './error-interno-servidor';
import { IOpcionesErrorConflictoEstado, objErrorConflictoEstado } from './error-conflicto-estado';
import { IOpcionesErrorPeticionNoValida, objErrorPeticionNoValida } from './error-peticion-no-valida';
import { IOpcionesErrorRecursoNoEncontrado, objErrorRecursoNoEncontrado } from './error-recurso-no-encontrado';
import { IOpcionesErrorServicioNoDisponible, objErrorServicioNoDisponible } from './error-servicio-no-disponible';

export interface IOpcionesError {
  /**
   * Error HTTP = 400
   */
  peticionNoValida: IOpcionesErrorPeticionNoValida;
  /**
   * Error HTTP = 404
   */
  recursoNoEncontrado: IOpcionesErrorRecursoNoEncontrado;
  /**
   * Error HTTP = 409
   */
  conflictoEstado: IOpcionesErrorConflictoEstado;
  /**
   * Error HTTP = 500
   */
  errorInternoServidor: IOpcionesErrorInternoServidor;
  /**
   * Error HTTP = 503
   */
  servicioNoDisponible: IOpcionesErrorServicioNoDisponible;
  /**
   * Error HTTP = 401
   */
  peticionNoAutorizada: IOpcionesErrorPeticionNoValida;
  /**
  * Error HTTP = 403
  */
  peticionInvalida: IOpcionesErrorPeticionNoValida;
}

export const errorApi: IOpcionesError = {
  peticionNoValida: objErrorPeticionNoValida(400, 'Petición no válida. Favor de revisar su información'),
  peticionNoAutorizada: objErrorPeticionNoValida(401, 'No estas autorizado, favor de validar'),
  peticionInvalida: objErrorPeticionNoValida(403, 'No estas autorizado, favor de validar'),
  recursoNoEncontrado: objErrorRecursoNoEncontrado(404, 'Recurso no encontrado'),
  conflictoEstado: objErrorConflictoEstado(409, 'Conflicto con el estado actual del recurso'),
  errorInternoServidor: objErrorInternoServidor(500, 'Error Interno del servidor'),
  servicioNoDisponible: objErrorServicioNoDisponible(503, 'Servicio no disponible temporalmente'),
};
