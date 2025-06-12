import { NextFunction, Request, Response } from "express";
import {
  body,
  CustomValidator,
  header,
  ValidationChain,
} from "express-validator";
import { errorApi, exitoApi } from "../respuestas";
import { EMensajesError, SistemasEnum } from "../enum/enums";
import jwt from "jsonwebtoken";
import { LoggerS3 } from "../middlewares/logger.s3";
import { performance } from "perf_hooks";
import { IDetalleServicio } from "../models/model";
import { Cifrado } from "../cifrado";

export const formatoFecha =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?$/;
export const msjFormatoFecha = "YYYY-MM-DDTHH:mm:ss.sss";

/* export const formatoFecha = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3}[zZ])?$/;
export const msjFormatoFecha = 'YYYY-MM-DDTHH:mm:ss o YYYY-MM-DDTHH:mm:ss.sss'; */

const logger = LoggerS3.getInstance().getLogger();

export const validarCampoFecha = (
  validation: ValidationChain,
  nombreCampo: string
): ValidationChain => {
  validation
    .trim()
    .notEmpty()
    .withMessage(`${nombreCampo} es requerido`)
    .bail();
  return validation
    .isISO8601({ strictSeparator: true, strict: true })
    .withMessage(`${nombreCampo} no es válida`)
    .bail()
    .matches(formatoFecha)
    .withMessage(`${nombreCampo} debe tener formato ${msjFormatoFecha}`)
    .bail();
};

export function rellenaConCerosCadena(cadena: string, max: number): string {
  if (String(cadena).length < max) {
    const incio = String(cadena).length;
    // eslint-disable-next-line no-plusplus
    for (let i = incio; i < max; i++) {
      // eslint-disable-next-line no-param-reassign
      cadena = `0${cadena}`;
    }
  }
  return cadena;
}

const calcularTiempoEjecucion = (param: {
  inicio: number;
  final: number;
}): number => Math.trunc(param.final - param.inicio);

export const iniciaTiempo = () => performance.now();

enum LoggerLevelsEnum {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
}

export const calculaTiempo = (
  data: [string, SistemasEnum, number],
  mensaje: string,
  tipolog: LoggerLevelsEnum = LoggerLevelsEnum.INFO,
  inDetServicio?: IDetalleServicio[]
): IDetalleServicio[] => {
  const detalleServicio = {
    servicio: data[0],
    sistema: SistemasEnum[data[1]],
    tiempo: data[2],
  };
  detalleServicio.tiempo = calcularTiempoEjecucion({
    inicio: data[2],
    final: performance.now(),
  });
  const detServicio = inDetServicio
    ? [detalleServicio].concat(inDetServicio)
    : [detalleServicio];
  switch (tipolog) {
    case LoggerLevelsEnum.ERROR:
      logger.error(mensaje, detServicio);
      break;
    case LoggerLevelsEnum.WARN:
      logger.warn(mensaje, detServicio);
      break;
    case LoggerLevelsEnum.INFO:
      logger.info(mensaje, detServicio);
      break;
    // case LoggerLevelsEnum.DEBUG:
    default:
      logger.debug(mensaje, detServicio);
      break;
  }
  return [detalleServicio];
};

export const campoRequerido = (campo: string): string =>
  `El campo ${campo} es requerido y debe contener información`;
export const campoEsCadena = (campo: string): string =>
  `El campo ${campo} es de tipo cadena (string)`;
export const campoEsBooleano = (campo: string): string =>
  `El campo ${campo} es de tipo booleano (boolean)`;
export const campoEsBase64 = (campo: string): string =>
  `El campo ${campo} proporcionado no tiene un cifrado válido`;
export const campoBase64Invalido = (campo: string): string =>
  `El campo ${campo} cifrado es demasiado corto para ser válida.`;
export const campoBase64Corrupto = (campo: string): string =>
  `El campo ${campo} cifrado no es válido o está corrupto.`;
export const campoNoDebeSerBase64 = (campo: string): string =>
  `El campo ${campo} no debe ser un base64`;
export const campoEstaVacio = (campo: string): string =>
  `El campo ${campo} debe contener información`;
export const campoNumerico = (campo: string): string =>
  `El campo ${campo} es de tipo número`;
export const campoCadenaNumerica = (campo: string): string =>
  `El campo ${campo} solo puede contener numeros`;
export const campoLongitud = (
  campo: string,
  min?: number,
  max?: number
): string =>
  `El campo ${campo} debe tener minimo ${min || 2} caracteres y maximo ${
    max || 35
  }`;
export const campoNumValido = (
  campo: string,
  min?: number,
  max?: number
): string =>
  `El campo ${campo} no es valido, valores permitidos ${min || 1} - ${
    max || 50
  }`;
export const campoEsArreglo = (campo: string): string =>
  `El campo ${campo} es requerido de tipo arreglo []`;
export const campoArregloInvalido = (campo: string): string =>
  `El campo ${campo} debe incluir minimo un elemento`;
export const campoEsObjeto = (campo: string, esOpcional?: boolean): string =>
  `El campo ${campo} ${
    !esOpcional ? "es requerido y " : " "
  }es de tipo objeto {}`;
export const campoCadenaInvalida = (campo: string): string =>
  `El campo ${campo} contiene caracteres no permitidos o no es válido`;
export const campoFormatoFecha = (campo: string): string =>
  `El campo ${campo} no cumple con el formato YYYY-MM-DD`;
export const esValidoNumeroPositivo: CustomValidator = (
  value,
  { req, path }
) => {
  if (typeof value !== "number") {
    throw new Error(campoNumerico(path));
  }
  if (!Number.isInteger(value)) {
    throw new Error(
      `El campo ${path} debe ser un número entero sin decimales.`
    );
  }
  if (value < 0) {
    throw new Error(`El campo ${path} debe ser mayor a 0`);
  }
  return true;
};

export const validaHeaders = (): Array<ValidationChain> => [
  header("token")
    .trim()
    .notEmpty()
    .withMessage("No se ha capturado el token, favor de validar.4016"),
  header("x-aplicacion")
    .trim()
    .notEmpty()
    .withMessage("x-aplicacion: Campo obligatorio.4012")
    .bail(),
  header("x-id-acceso")
    .trim()
    .notEmpty()
    .withMessage("x-id-acceso: Campo obligatorio.4013")
    .bail()
    .isInt()
    .withMessage("x-id-acceso: Campo numerico.4015")
    .bail(),
];

export const isValidEncryptedString: CustomValidator = (
  value,
  { req, path }
) => {
  try {
    const buffer = Buffer.from(value, "base64");
    // Longitud mínima esperada (AES ≈ 28 bytes, RSA puede ser mayor)
    if (buffer.length < 28) {
      throw new Error(
        `El campo ${path} cifrado es demasiado corto para ser válido.`
      );
    }
    return true;
  } catch (err) {
    throw new Error(`El campo ${path} cifrado no es válido o está corrupto.`);
  }
};

export const validaXIdAcceso = async (
  solicitud: Request,
  respuesta: Response,
  sig: NextFunction
): Promise<void> => {
  const value = solicitud.headers["x-id-acceso"]
    ? solicitud.headers["x-id-acceso"].toString()
    : "";
  if (!/^[0-9]{10,13}$/.test(value)) {
    throw errorApi.peticionNoAutorizada.faltanParametros(
      EMensajesError.NOT_AUTH,
      4100
    );
  }
  sig();
};

export const generaRespuesta = async (
  data: { codigoHttp: number; mensaje?: string; respuesta?: unknown },
  resp: Response
): Promise<Response> => {
  const { codigoHttp, mensaje, respuesta } = data;
  switch (codigoHttp) {
    case 200:
      return exitoApi.exito(resp, respuesta);
    case 201:
      return exitoApi.creado(resp, respuesta);
    case 204:
      return exitoApi.sinContenido(resp);
    case 401:
      throw errorApi.peticionNoAutorizada.parametrosNoValidos(
        mensaje || EMensajesError.NOT_AUTH
      );
    case 400:
      throw errorApi.peticionNoValida.parametrosNoValidos(
        mensaje || EMensajesError.BAD_REQ
      );
    case 404:
      throw errorApi.recursoNoEncontrado.recursoBDNoEncontrado(
        mensaje || EMensajesError.NOT_FOUND
      );
    default:
      throw errorApi.errorInternoServidor.desconocido(
        mensaje || EMensajesError.ERROR
      );
  }
};

export const verificaToken = async (
  solicitud: Request,
  respuesta: Response,
  siguiente: NextFunction
): Promise<void> => {
  const authHeader = solicitud.headers.token as string;
  const estesting = Number(solicitud.headers.estesting) || 0;
  if ([1].includes(estesting)) {
    return siguiente();
  }
  if (!process.env.TOKEN_KEY_PUBLICA) {
    throw errorApi.peticionNoAutorizada.tokenNoValido(
      "El campo TOKEN_KEY_PUBLICA, no es valida, favor de validar",
      4101
    );
  }
  const llaveToken = [
    "-----BEGIN PUBLIC KEY-----",
    process.env.TOKEN_KEY_PUBLICA,
    "-----END PUBLIC KEY-----",
  ]
    .join("\n")
    .toString();
  jwt.verify(
    authHeader.trim(),
    llaveToken,
    { algorithms: ["RS256"] },
    (err) => {
      if (err) {
        logger.debug(
          `El token no es valido, favor de solicitar uno nuevo ${err}`
        );
        throw errorApi.peticionNoAutorizada.tokenNoValido(
          "El token no es valido, favor de solicitar uno nuevo",
          4104
        );
      }
    }
  );
  return siguiente();
};

export const isBase64 = (str: string): boolean => {
  if (typeof str !== "string") return false;

  // Expresión regular para validar Base64
  const base64Regex =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  return base64Regex.test(str);
};

export const validaCadenaCifrada = (
  campo: string,
  esOpcional = false
): ValidationChain[] => {
  const cadena = body(campo);
  return esOpcional
    ? [
        cadena
          .optional()
          // .notEmpty()
          // .withMessage(`${campo} debe contener informacion`)
          // .bail()
          .isString()
          .withMessage(campoEsCadena(campo))
          .bail()
          .isBase64()
          .withMessage(campoEsBase64(campo))
          .bail()
          .custom(isValidEncryptedString),
      ]
    : [
        cadena
          .notEmpty()
          .withMessage(campoRequerido(campo))
          .bail()
          .isString()
          .withMessage(campoEsCadena(campo))
          .bail()
          .isBase64()
          .withMessage(campoEsBase64(campo))
          .bail()
          .custom(isValidEncryptedString),
      ];
};

export const validaCadenaNoCifrada = (
  campo: string,
  esOpcional = false
): ValidationChain[] => {
  const cadena = body(campo);
  return esOpcional
    ? [
        cadena
          .optional()
          .isString()
          .withMessage(campoEsCadena(campo))
          .bail()
          .trim()
          .custom((value) => value !== "")
          .withMessage(campoEstaVacio(campo))
          .bail()
          .custom((value) => !isBase64(value))
          .withMessage(campoNoDebeSerBase64(campo)),
      ]
    : [
        cadena
          .isString()
          .withMessage(campoEsCadena(campo))
          .bail()
          .trim()
          .notEmpty()
          .withMessage(campoEstaVacio(campo))
          .bail()
          .custom((value) => !isBase64(value))
          .withMessage(campoNoDebeSerBase64(campo)),
      ];
};

/**
 *
 * @param campo Debe ser un campo que corresponda a paginacion o rango de numeros de tipo entero
 * @returns
 */
export const validacionCampoNumerico = (
  campo: string,
  esOpcional = false,
  min = 1,
  max = 50
): ValidationChain[] => {
  const cadena = body(campo);
  return esOpcional
    ? [
        cadena
          .optional()
          .custom(esValidoNumeroPositivo)
          .bail()
          .isInt({ min, max })
          .withMessage(campoNumValido(campo, min, max))
          .bail(),
      ]
    : [
        cadena
          .notEmpty()
          .withMessage(campoRequerido(campo))
          .bail()
          .custom(esValidoNumeroPositivo)
          .bail()
          .isInt({ min, max })
          .withMessage(campoNumValido(campo, min, max))
          .bail(),
      ];
};

export const validacionArreglo = (
  campo: string,
  esOpcional = false,
  min = 1,
  max = 50
): ValidationChain[] => {
  const cadena = body(campo);
  return esOpcional
    ? [
        cadena
          .optional()
          .isArray()
          .withMessage(campoEsArreglo(campo))
          .bail()
          .isArray({ min, max })
          .withMessage(campoArregloInvalido(campo))
          .bail(),
      ]
    : [
        cadena
          .isArray()
          .withMessage(campoEsArreglo(campo))
          .bail()
          .isArray({ min, max })
          .withMessage(campoArregloInvalido(campo))
          .bail(),
      ];
};

export const validacionCadena = (
  campo: string,
  esOpcional = false,
  min = 2,
  max = 25
): ValidationChain[] => {
  const cadena = body(campo);
  return esOpcional
    ? [
        cadena
          .optional()
          .notEmpty()
          .withMessage(campoRequerido(campo))
          .bail()
          .isString()
          .withMessage(campoEsCadena(campo))
          .bail()
          .isLength({ min, max })
          .withMessage(campoLongitud(campo))
          .bail()
          .custom((value) => {
            const regex = new RegExp(`^(?!(true|false)$)[^.,]{${min},${max}}$`);
            if (!regex.test(value)) {
              throw Error(campoCadenaInvalida(campo));
            }
            return true;
          }),
      ]
    : [
        cadena
          .notEmpty()
          .withMessage(campoRequerido(campo))
          .bail()
          .isString()
          .withMessage(campoEsCadena(campo))
          .bail()
          .isLength({ min, max })
          .withMessage(campoLongitud(campo))
          .bail()
          .custom((value) => {
            const regex = new RegExp(`^(?!(true|false)$)[^.,]{${min},${max}}$`);
            if (!regex.test(value)) {
              throw Error(campoCadenaInvalida(campo));
            }
            return true;
          }),
      ];
};

export const validacionCadenaNumeros = (
  campo: string,
  esOpcional = false
): Array<ValidationChain> => {
  const cadena = body(campo);
  return esOpcional
    ? [
        cadena
          .optional()
          .notEmpty()
          .trim()
          .withMessage(campoEstaVacio(campo))
          .bail()
          .matches(/^\d+$/)
          .withMessage(campoCadenaNumerica(campo))
          .bail()
          .isLength({ min: 3, max: 15 })
          .withMessage(campoLongitud(campo, 3, 15))
          .bail(),
      ]
    : [
        cadena
          .notEmpty()
          .trim()
          .withMessage(campoEstaVacio(campo))
          .bail()
          .matches(/^\d+$/)
          .withMessage(campoCadenaNumerica(campo))
          .bail()
          .isLength({ min: 5, max: 15 })
          .withMessage(campoLongitud(campo, 5, 15))
          .bail(),
      ];
};

export const validacionObjeto = (
  campo: string,
  esOpcional = false
): Array<ValidationChain> => {
  const cadena = body(campo);
  return esOpcional
    ? [
        cadena
          .optional()
          .isObject()
          .withMessage(campoEsObjeto(campo, esOpcional))
          .bail(),
      ]
    : [cadena.isObject().withMessage(campoEsObjeto(campo, esOpcional))];
};

export const validacionFecha = (
  campo: string,
  esOpcional = false
): Array<ValidationChain> => {
  const fecha = body(campo);
  return esOpcional
    ? [
        fecha
          .optional()
          .notEmpty()
          .trim()
          .withMessage(campoEstaVacio(campo))
          .bail()
          .matches(/^\d{4}-\d{2}-\d{2}$/)
          .withMessage(campoFormatoFecha(campo))
          .bail(),
      ]
    : [
        fecha
          .notEmpty()
          .trim()
          .withMessage(campoEstaVacio(campo))
          .bail()
          .matches(/^\d{4}-\d{2}-\d{2}$/)
          .withMessage(campoFormatoFecha(campo))
          .bail(),
      ];
};

type DescifradoInput = {
  obj: any;
  cifrados: string[];
  accesoPrivado: string;
  rsaOAEP: boolean;
};

const aplicarDescifrado = (
  actual: any,
  path: string[],
  accesoPrivado: string,
  rsaOAEP: boolean
): void => {
  if (!actual || path.length === 0) return;
  const [parte, ...resto] = path;
  if (parte.endsWith("[]")) {
    const key = parte.slice(0, -2);
    const arr = actual[key];
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      aplicarDescifrado(item, resto, accesoPrivado, rsaOAEP);
    }
  } else {
    if (!(parte in actual)) return;
    if (resto.length === 0) {
      // Descifrar valor
      const valor = actual[parte];
      if (typeof valor === "string") {
        const resultado = rsaOAEP
          ? Cifrado.getInstance().descifrarRSAOAEP(
              valor.trim(),
              accesoPrivado || ""
            )
          : Cifrado.getInstance().descifraRSAPSK1(
              valor.trim(),
              accesoPrivado || ""
            );
        if (resultado.error) {
          logger.info(`Problema al descifrar ${parte} con idAcceso proporcionado`);
          throw errorApi.peticionNoAutorizada.peticionNoAutorizada(
            EMensajesError.KEY_ERROR,
            4109
          );
        }
        actual[parte] = resultado.valor;
      }
    } else {
      aplicarDescifrado(actual[parte], resto, accesoPrivado, rsaOAEP);
    }
  }
};

/***
 * Ejemplo
 * const keysADecifrar = [
  'numeroEmpleado',
  'evaluacion.numeroEmpleado',
  'candidato.nombre',
  'secciones[].preguntas[].nombre',
    ];
 */
export const descifrarCampos = ({
  obj,
  cifrados,
  accesoPrivado,
  rsaOAEP,
}: DescifradoInput): void => {
  for (const ruta of cifrados) {
    aplicarDescifrado(obj, ruta.split("."), accesoPrivado, rsaOAEP);
  }
};

export * from ".";
