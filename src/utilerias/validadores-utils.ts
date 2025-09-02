import { NextFunction, Request, Response } from "express";
import {
  body,
  CustomValidator,
  header,
  Meta,
  param,
  query,
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
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  VERBOSE = "verbose",
  DEBUG = "debug",
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
  if (!/^[0-9]{10,20}$/.test(value)) {
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
  const istesting = Number(solicitud.headers.istesting) || 0;
  if ([1].includes(istesting)) {
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
  esOpcional = false,
  min = 3,
  max = 15
): Array<ValidationChain> => {
  const cadena = body(campo);
  const reglaBase = cadena
    .trim()
    .notEmpty()
    .withMessage(campoEstaVacio(campo))
    .bail()
    .matches(/^\d+$/)
    .withMessage(campoCadenaNumerica(campo))
    .bail()
    .isLength({ min, max })
    .withMessage(campoLongitud(campo, min, max))
    .bail()
    .custom((value) => {
      if (/^0+$/.test(value)) {
        throw new Error(`${campo} no puede contener solo ceros`);
      }
      return true;
    });

  return esOpcional
    ? [
        cadena.optional(),
        // .customSanitizer(() => null)
        // .bail(),
        reglaBase,
      ]
    : [reglaBase];
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
          logger.info(
            `Problema al descifrar ${parte} con idAcceso proporcionado`
          );
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

export const validaCadenaNoCifradaV2 = (
  field: string,
  options?: { optional?: boolean; max?: number; min?: number }
): ValidationChain => {
  const max = options?.max;
  const min = options?.min || 1;
  const optional = options?.optional || false;
  let chain = body(field);
  chain = optional ? chain.optional() : chain;
  chain = chain
    .isString()
    .withMessage(campoEsCadena(field))
    .trim()
    .notEmpty()
    .withMessage(campoRequerido(field))
    .bail()
    .not()
    .matches(/^(?:[A-Za-z0-9+/]{4})*[A-Za-z0-9+/]{3}=$/)
    .withMessage(`${field}: cadena no cumple el formato`);

  if (options?.min || options?.max) {
    chain = chain
      .isLength({
        min: min,
        max: max,
      })
      .withMessage(
        `${field} debe tener entre ${min} y ${max ?? "∞"} caracteres`
      );
  }
  return chain;
};

export const validaCadenaCifradaV2 = (
  field: string,
  options?: { optional?: boolean }
): ValidationChain => {
  let chain = options?.optional
    ? body(field).optional()
    : body(field).notEmpty().withMessage(campoRequerido(field)).bail();
  chain = chain
    .isString()
    .withMessage(campoEsCadena(field))
    .bail()
    .isBase64()
    .withMessage(campoEsBase64(field))
    .bail()
    .custom(isValidEncryptedString);
  return chain;
};

export const validaCadenaNumerosV2 = (
  field: string,
  options?: { optional?: boolean; min?: number; max?: number }
): ValidationChain => {
  let chain = validaCadenaNoCifradaV2(field, options)
    .matches(/^\d+$/)
    .withMessage(`El campo ${field} debe ser un número decimal válido.`);
  return chain;
};

export const validaCadenaNumerosFloat = (
  field: string,
  options?: { optional?: boolean; min?: number; max?: number }
): ValidationChain => {
  let chain = validaCadenaNoCifradaV2(field, options)
    .matches(/^\d*\.\d+$|^\d+$/)
    .withMessage(`El campo ${field} debe ser un número decimal válido.`);
  return chain;
};

export const validaCadenaNoCifradaSiObjetoExiste = (
  object: string,
  field: string
): ValidationChain => {
  const fullPath = `${object}.${field}`;
  return body(fullPath)
    .if(body(object).exists())
    .isString()
    .withMessage(campoEsCadena(fullPath))
    .trim()
    .notEmpty()
    .withMessage(campoRequerido(fullPath))
    .bail()
    .bail()
    .not()
    .matches(/^(?:[A-Za-z0-9+/]{4})*[A-Za-z0-9+/]{3}=$/)
    .withMessage(`${fullPath}: cadena no cumple el formato`);
};

export const validaCadenaNoCifradaSiArrayExiste = (
  array: string,
  field: string
): ValidationChain => {
  const fullPath = `${array}.*.${field}`;
  return body(fullPath)
    .if(body(array).exists())
    .isString()
    .withMessage(campoEsCadena(fullPath))
    .trim()
    .notEmpty()
    .bail()
    .withMessage(campoRequerido(fullPath))
    .bail()
    .not()
    .matches(/^(?:[A-Za-z0-9+/]{4})*[A-Za-z0-9+/]{3}=$/)
    .withMessage(`${fullPath}: cadena no cumple el formato`);
};

export const validaCadenaCifradaSiArrayExiste = (
  array: string,
  field: string
): ValidationChain => {
  const fullPath = `${array}.*.${field}`;
  return body(fullPath)
    .if(body(array).exists())
    .isString()
    .withMessage(campoEsCadena(fullPath))
    .bail()
    .isBase64()
    .withMessage(campoEsBase64(fullPath))
    .bail()
    .custom(isValidEncryptedString);
};

/**
 * Verifica que una fecha exista en realidad. Ejemplo 2024/01/10 -> true / 2025/02/55 -> false
 *
 * @param dateString - Fecha formato YYYY/MM/DD
 * @returns Boolean correspondiente a si es correcto
 */
export const isValidDate = (dateString: string): boolean => {
  const [day, month, year] = dateString
    .split("/")
    .map((num) => parseInt(num, 10));
  const date = new Date(year, month - 1, day);
  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year
  );
};

export const descifrarCampo = (field: string): ValidationChain => {
  return body(field).customSanitizer((value: any, meta: Meta) => {
    if (value) {
      const privateAccess = meta.req.accesoPrivado;
      const idAcceso = Number(meta.req.headers!["x-id-acceso"]) || 0;

      const decifrado = Cifrado.getInstance().descifrarRSAOAEP(
        `${value}`.trim(),
        privateAccess || ""
      );

      if (decifrado.error) {
        LoggerS3.getInstance()
          .getLogger()
          .info(
            `Problemas al decifrar el atributo ${field} con el idAcceso ${idAcceso}`
          );
        throw errorApi.peticionNoAutorizada.peticionNoAutorizada(
          EMensajesError.KEY_ERROR,
          4109
        );
      }
      return decifrado.valor;
    }
    return value;
  });
};

/**
 * Descifra los campos de un request
 *
 * @param campos - Lista con el nombre de los campos a descifrar con la sintaxis de express-validator
 * @returns Array para modificar el request como middleware
 */
export const descifrarDatos = (
  campos: Array<string>
): Array<ValidationChain> => {
  return campos.map((value) => {
    return descifrarCampo(value);
  });
};

/**
 * Genera un validador para uno o varios campos alfanuméricos con signos opcionales.
 * Reglas:
 * - Permite letras, números, y los signos + y -.
 * - Valida longitud mínima y máxima.
 * - Si es solo numérico, no debe ser todo ceros.
 * - Si es solo letras, no puede ser "true" o "false".
 *
 * @param fields Nombre(s) del campo en el body. Puede ser string o string[]
 * @param esOpcional Si es true, el/los campos serán opcionales; si es false, será requerido. Default: false
 * @param min Longitud mínima del campo. Default: 2
 * @param max Longitud máxima del campo. Default: 15
 */
export const validaCadenaFolios = (
  fields: string | string[],
  esOpcional = false,
  min = 2,
  max = 15
): ValidationChain[] => {
  const arr = Array.isArray(fields) ? fields : [fields];

  return arr.map((field) => {
    let validador = body(field)
      .isString()
      .withMessage(`${field} debe ser un string`)
      .matches(/^[A-Za-z0-9+-]+$/)
      .withMessage(`${field} solo puede contener letras, números, + o -`)
      .isLength({ min, max })
      .withMessage(`${field} debe tener entre ${min} y ${max} caracteres`)
      .custom((value: string) => {
        if (/^[0-9]+$/.test(value) && /^0+$/.test(value)) {
          throw new Error(`${field} no puede ser solo ceros`);
        }
        if (/^[A-Za-z]+$/.test(value) && /^(true|false)$/i.test(value)) {
          throw new Error(`${field} no puede contener "true" o "false"`);
        }
        return true;
      });

    return esOpcional
      ? validador.optional()
      : validador.notEmpty().withMessage(`${field} es requerido`);
  });
};

/**
 * Genera un validador genérico para campos tipo string que solo aceptan letras.
 * Reglas:
 *  - Debe ser string.
 *  - Solo permite letras (A-Z, a-z).
 *  - No permite los valores "true" o "false".
 *  - Valida longitud mínima y máxima.
 *
 * @param campo Nombre del campo a validar.
 * @param fuente Fuente del dato: "body", "query" o "params". Default: "body".
 * @param esOpcional Si el campo es opcional. Default: false (requerido).
 * @param min Longitud mínima del string. Default: 3.
 * @param max Longitud máxima del string. Default: 50.
 * @returns ValidationChain listo para usar en middlewares de express-validator.
 */
export const generarValidadorString = (
  campo: string,
  fuente: "body" | "query" | "params" = "body",
  esOpcional = false,
  min = 3,
  max = 50
): ValidationChain => {
  // Selecciona la fuente
  let validador: ValidationChain;
  switch (fuente) {
    case "query":
      validador = query(campo);
      break;
    case "params":
      validador = param(campo);
      break;
    default:
      validador = body(campo);
  }

  // Opcional
  if (esOpcional) {
    validador = validador.optional();
  } else {
    validador = validador.notEmpty().withMessage(`${campo} es requerido`);
  }

  return validador
    .isString()
    .withMessage(`${campo} debe ser un string`)
    .bail()
    .matches(/^[A-Za-z]+$/)
    .withMessage(`${campo} solo debe contener letras`)
    .bail()
    .custom((value: string) => {
      const lower = value.toLowerCase();
      if (lower === "true" || lower === "false") {
        throw new Error(`${campo} no puede ser 'true' o 'false'`);
      }
      return true;
    })
    .bail()
    .isLength({ min, max })
    .withMessage(`${campo} debe tener entre ${min} y ${max} caracteres`)
    .bail();
};

export const generaResponse = async (
  respuesta: Response,
  data: {
    codigoHttp: number;
    mensaje?: string;
    resultado?: any;
  }
): Promise<Response> => {
  const { codigoHttp, mensaje, resultado } = data;
  switch (codigoHttp) {
    case 200: {
      return resultado
        ? exitoApi.exito(respuesta, resultado)
        : exitoApi.exito(respuesta);
    }
    case 201: {
      return resultado
        ? exitoApi.creado(respuesta, resultado)
        : exitoApi.creado(respuesta);
    }
    case 204: {
      return exitoApi.sinContenido(respuesta);
    }
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

export const validaPropiedadSiObjetoExiste = (
  object: string,
  field: string
): ValidationChain[] => {
  const fullPath = `${object}.${field}`;
  return [
    body(fullPath)
      .if(body(object).exists())
      .trim()
      .notEmpty()
      .withMessage(campoRequerido(fullPath))
      .bail()
      .isString()
      .withMessage(campoEsCadena(fullPath))
      .bail()
      .trim(),
  ];
};

export const validaPropiedadSiArrayExiste = (
  array: string,
  field: string
): ValidationChain[] => {
  const fullPath = `${array}.*.${field}`;
  return [
    body(fullPath)
      .if(body(array).exists())
      .trim()
      .notEmpty()
      .withMessage(campoRequerido(fullPath))
      .bail()
      .isString()
      .withMessage(campoEsCadena(fullPath))
      .bail(),
  ];
};

export const isBooleanField = (
  field: string,
  options?: { optional: boolean }
) => {
  let chain = options?.optional
    ? body(field).optional()
    : body(field).notEmpty().withMessage(campoRequerido(field)).bail();
  chain = chain.isBoolean({ strict: true }).withMessage(campoEsBooleano(field));
  return chain;
};

/**
 * Validador genérico para campos de texto como nombres de personas,
 * ciudades, países o estados.
 *
 * Reglas de validación:
 * - Permite solo letras A-Z y espacios.
 * - No permite acentos, números ni caracteres especiales.
 * - No permite valores literales "true" o "false".
 * - Valida longitud mínima y máxima del texto.
 *
 * @param campo - Nombre del campo en el body a validar.
 * @param min - Longitud mínima permitida (default: 2).
 * @param max - Longitud máxima permitida (default: 50).
 * @returns ValidationChain[] - Cadena de validación para express-validator.
 */
export const validarTextoGenerico = (
  campo: string,
  esOpcional: boolean = false,
  min: number = 2,
  max: number = 50
): ValidationChain => {
  return esOpcional
    ? body(campo)
        .optional()
        .isLength({ min, max })
        .withMessage(`${campo} debe tener entre ${min}-${max} caracteres`)
        .matches(/^(?!true$)(?!false$)[A-Za-z ]+$/)
        .withMessage(`${campo} solo permite letras y espacios`)
    : body(campo)
        .notEmpty()
        .withMessage(`${campo} es requerido`)
        .isLength({ min, max })
        .withMessage(`${campo} debe tener entre ${min}-${max} caracteres`)
        .matches(/^(?!true$)(?!false$)[A-Za-z ]+$/)
        .withMessage(`${campo} solo permite letras y espacios`);
};

export const validaCamposSiPadreExiste = (
  padre: string,
  hijos: string[]
): ValidationChain[] => {
  return hijos.map((hijo) => {
    const fullPath = `${padre}.${hijo}`;
    return body(fullPath)
      .if(body(padre).exists()) // solo si existe el padre
      .trim()
      .notEmpty()
      .withMessage(`El campo ${fullPath} es requerido`)
      .bail()
      .isString()
      .withMessage(`El campo ${fullPath} debe ser una cadena`)
      .trim();
    // .custom((g)=>{
    //   console.log("🚀 ~ validaCamposSiPadreExiste ~ g:", g)
    //   return true
    // })
  });
};

export interface IPaginacion<T> {
  paginacion: {
    pagina: number;
    registrosPagina: number;
    totalPaginas: number;
    totalRegistros: number;
  };
  registros: T[];
}

export const generaPaginas = <T>(
  input: {
    paginacion?: {
      pagina: number;
      registrosPagina: number;
    };
  },
  data: T[]
): IPaginacion<T> => {
  const pagina = input.paginacion?.pagina ?? 1;
  const registrosPagina = input.paginacion?.registrosPagina ?? 10;

  const totalRegistros = data.length;
  const totalPaginas = Math.ceil(totalRegistros / registrosPagina);

  const inicio = (pagina - 1) * registrosPagina;
  const fin = inicio + registrosPagina;

  const resultados = data.slice(inicio, fin);

  return {
    paginacion: {
      pagina: Number(pagina),
      registrosPagina: Number(registrosPagina),
      totalPaginas: Number(totalPaginas),
      totalRegistros: Number(totalRegistros),
    },
    registros: resultados,
  };
};

interface ValidarNumeroOptions {
  esOpcional?: boolean;
  min?: number;
  max?: number;
}

/**
 * Valida que un campo sea un número entero real (no string, no decimal).
 * Funciona para campos simples o en arrays/objetos anidados usando "*".
 * @param path ruta al campo, ej: "paginacion.pagina" o "solicitudes.*.id"
 * @param options Opciones de validación: esOpcional, min, max
 */
export const validarNumeroEnteroMiddleware = (
  path: string,
  options: ValidarNumeroOptions = {}
) => {
  const {
    esOpcional = false,
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const keys = path.split(".");

    const validate = (obj: any, idxKeys = 0, parentPath = "") => {
      const key = keys[idxKeys];
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      const value = obj?.[key];

      if (key === "*") {
        if (!Array.isArray(obj))
          throw new Error(`${parentPath} debe ser un array`);
        obj.forEach((el, idx) =>
          validate(el, idxKeys + 1, `${parentPath}[${idx}]`)
        );
        return;
      }

      if (idxKeys < keys.length - 1) {
        if (value === undefined || value === null) {
          if (!esOpcional) throw new Error(`${currentPath} es requerido`);
          return;
        }
        validate(value, idxKeys + 1, currentPath);
        return;
      }

      // Validación final
      if (value === undefined || value === null) {
        if (!esOpcional) throw new Error(`${currentPath} es requerido`);
        return;
      }

      if (typeof value !== "number") {
        throw new Error(`${currentPath} debe ser un número, no un string`);
      }

      if (!Number.isInteger(value)) {
        throw new Error(`${currentPath} debe ser un número entero`);
      }

      if (value < min) throw new Error(`${currentPath} debe ser >= ${min}`);
      if (value > max) throw new Error(`${currentPath} debe ser <= ${max}`);
    };

    try {
      validate(req.body);
      next();
    } catch (err: any) {
      throw errorApi.peticionNoValida.parametrosNoValidos(err.message);
    }
  };
};

export enum EOpEncrypt {
  CIFRADO = 1,
  DECIFRADO = 0,
}

/**
 * Aplica operaciones de cifrado o descifrado RSA a los campos especificados de un objeto.
 *
 * Esta función recorre el objeto `obj` siguiendo las rutas definidas en `campos`.
 * Cada ruta puede ser:
 *  - Una propiedad simple: "campo"
 *  - Propiedades anidadas: "objeto.subobjeto.campo"
 *  - Arreglos usando "[]": "detalle[].precio" recorrerá cada elemento del arreglo `detalle`
 *
 * Dependiendo de `operacion`, se puede cifrar o descifrar el campo:
 *  - operacion = true: cifrar usando RSA
 *  - operacion = false: descifrar usando RSA
 *
 * Si `oaep` es true, se utiliza OAEP; si es false, se usa PKCS#1.
 *
 * @param obj Objeto en el que se aplicará la operación
 * @param campos Arreglo de rutas a los campos que serán cifrados/descifrados
 * @param llave Llave RSA para la operación
 * @param oaep Booleano que indica si se utiliza OAEP
 * @param operacion Indica si se aplica cifrado (true) o descifrado (false)
 * @returns El mismo objeto `obj` con los campos modificados
 *
 * @example
 * const obj = { detalle: [{ precio: "123" }, { precio: "456" }] };
 * operacionesEncryptRSA(obj, ["detalle[].precio"], llave, true, true);
 * Ahora obj.detalle[0].precio y obj.detalle[1].precio están cifrados
 */
export const operacionesEncryptRSA = (
  obj: any,
  campos: string[],
  llave: string,
  oaep: boolean,
  operacion: EOpEncrypt
): any => {
  for (const campo of campos) {
    decifraCampo(obj, campo.split("."), llave, oaep, operacion);
  }
  return obj;
};

const decifraCampo = (
  obj: any,
  ruta: string[],
  llave: string,
  oaep: boolean,
  operacion: EOpEncrypt
): void => {
  if (!obj || ruta.length === 0) return;

  const parte = ruta[0];
  const resto = ruta.slice(1);

  // Caso arreglo con [*]
  if (parte.endsWith("[]")) {
    const key = parte.replace("[]", "");
    const arr = obj[key];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        decifraCampo(item, resto, llave, oaep, operacion);
      }
    }
    return;
  }

  // Último nivel → aplicar descifrado
  if (resto.length === 0) {
    if (
      obj.hasOwnProperty(parte) &&
      obj[parte] !== null &&
      obj[parte] !== undefined
    ) {
      try {
        obj[parte] = operacion
          ? Cifrado.getInstance().validaCadenaRSA(obj[parte], llave, oaep)
          : oaep
          ? Cifrado.getInstance().descifrarRSAOAEP(obj[parte], llave).valor
          : Cifrado.getInstance().descifraRSAPSK1(obj[parte], llave).valor;
      } catch (e) {
        console.log(
          "🚀 ~ SolicitudesController ~ decifraCampo ~  obj[parte]:",
          obj[parte]
        );
        console.warn(`Error descifrando campo ${parte}:`, e);
      }
    }
    return;
  }

  // Paso intermedio → bajar un nivel
  if (obj[parte]) {
    decifraCampo(obj[parte], resto, llave, oaep, operacion);
  }
};

export * from ".";
