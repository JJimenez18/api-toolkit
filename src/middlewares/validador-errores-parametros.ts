/* eslint-disable array-callback-return */
/* eslint-disable no-bitwise */
import {NextFunction, Request, Response} from 'express';
import {validationResult, ValidationError} from 'express-validator';
import {errorApi} from '../respuestas';

const terminaConPunto = (str: string): boolean => {
    if (typeof str !== 'string') return false;
    // Expresión regular: busca un punto seguido de algo (cualquier cosa después del punto)
    const regex = /\.\S+$/; // \S+ asegura que haya algo después del punto
    return regex.test(str);
};

const obtenerCadenaAntesDelUltimoPunto = (str: string): string => {
    if (typeof str !== 'string') return '';
    const lastIndex = str.lastIndexOf('.');
    return lastIndex !== -1 ? str.substring(0, lastIndex) : str;
};

const convertidor = (err: any[]): {mensajesError: string[]; codigoError: number} => {
    const mensajesError: string[] = [];
    let codigoError = 4000;
    err.forEach((element) => {
        if (terminaConPunto(element)) {
            const mensajeLimpio = obtenerCadenaAntesDelUltimoPunto(element);
            const parteDespuesDelPunto = element.substring(element.lastIndexOf('.') + 1);
            const codigoNumerico = Number(parteDespuesDelPunto);
            codigoError = !isNaN(codigoNumerico) ? codigoNumerico : codigoError;
            mensajesError.push(mensajeLimpio);
        } else {
            mensajesError.push(element);
        }
    });
    codigoError = mensajesError.length > 1 ? 4007 : codigoError;
    return {mensajesError, codigoError};
};

export class ValidadorErroresParametros {
    static validar = (solicitud: Request, respuesta: Response, siguienteMiddleware: NextFunction): void => {
        const errores = validationResult(solicitud);
        if (!errores.isEmpty()) {
            const err = errores.array().map((error: ValidationError) => error.msg);
            // throw new ErrorPeticionNoValida(ErrorPeticionNoValidaCodigos.PARAMETROS_NO_VALIDOS, err);
            const {codigoError, mensajesError} = convertidor(err);
            throw errorApi.peticionNoValida.parametrosNoValidos(
                mensajesError,
                Number.isInteger(codigoError) ? codigoError : 4000
            );
        }
        siguienteMiddleware();
    };
}
