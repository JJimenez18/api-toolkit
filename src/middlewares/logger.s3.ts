/* eslint-disable linebreak-style */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-shadow */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable camelcase */
/* eslint-disable max-len */
import winston, { createLogger, Logger, format, transports } from 'winston';
import stringify from 'fast-safe-stringify';
import { Format, TransformableInfo } from 'logform';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import { v4 } from 'uuid';
import { performance } from 'perf_hooks';
import { LoggerLevelsEnum, VariablesEntorno } from '../utilerias/variables-entorno';
import { IDetalleServicio } from '../models';

const { S3StreamLogger } = require('s3-streamlogger');

interface IFormatoServicio {
  servicio: string;
  Sistema: string;
  Tiempo: number;
}

interface IConfiguracionLog {
  bucket: string;
  folder?: string;
  nameFormat?: string;
  rotateEvery?: string;
  maxFileSize?: string;
  uploadEvery?: string;
  bufferSize?: string;
}

export interface ExtendedTransformableInfo extends TransformableInfo {
  [key: string]: unknown; // Agrega soporte para índices de tipo 'string'
}

export class LoggerS3 {
  private static instance: LoggerS3;
  private LoggerS3: Logger;
  static readonly LOGGER_LEVEL = process.env.LOGGER_LEVEL || 'debug';

  private static validarNivelLogger = (): void => {
    if (LoggerS3.LOGGER_LEVEL === '') {
      throw new Error('Falta la variable LOGGER_LEVEL');
    }
    let validLevel = false;
    const levels = Object.values(LoggerLevelsEnum);
    for (let i = 0; i < levels.length; i += 1) {
      if (levels[i] === LoggerS3.LOGGER_LEVEL) {
        validLevel = true;
        break;
      }
    }
    if (!validLevel) {
      throw new Error(`La variable LOGGER_LEVEL debe tener uno de los siguiente valores: ${stringify(levels)}`);
    }
  };

  static readonly LOGGER_COLOR = ((): boolean => {
    const varColor = process.env.LOGGER_COLOR || '';
    if (varColor === 'true') {
      return true;
    }
    if (varColor === 'false' || varColor === '') {
      return false;
    }
    throw new Error('LOGGER_COLOR debe ser true o false. Esta variable es opcional y su valor por default es false.');
  })();

  static readonly CONFIGURACION_LOG = ((): IConfiguracionLog => {
    let configuracion: IConfiguracionLog = { bucket: '' };
    if (!process.env.CONFIGURACION_LOG || `${process.env.CONFIGURACION_LOG}`.trim() === '') {
      return configuracion;
    }
    try {
      configuracion = JSON.parse(`${process.env.CONFIGURACION_LOG}`.replace(/[']+/g, '"'));
    } catch (error) {
      console.error('La variable configuracionLog debe ser un JSON');
    }
    return configuracion;
  })();

  constructor() {
    const formt: Format[] = [
      format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss' }),
      format.label({ label: path.basename(module.filename) }),
      format.printf(this.formatoLog)
    ];
    if (LoggerS3.LOGGER_COLOR) {
      formt.push(format.colorize({ all: true }));
    }
    const transportes: winston.transport[] = [new transports.Console()];
    if (
      LoggerS3.CONFIGURACION_LOG.bucket !== '' &&
      VariablesEntorno.AWS_ACCESS_KEY_ID !== '' &&
      VariablesEntorno.AWS_SECRET_ACCESS_KEY !== ''
    ) {
      const { bucket, bufferSize, folder, maxFileSize, nameFormat, rotateEvery, uploadEvery } =
        LoggerS3.CONFIGURACION_LOG;
      try {
        const s3_stream = new S3StreamLogger({
          bucket,
          name_format: nameFormat || `${VariablesEntorno.API_NOMBRE}.txt`,
          access_key_id: VariablesEntorno.AWS_ACCESS_KEY_ID,
          secret_access_key: VariablesEntorno.AWS_SECRET_ACCESS_KEY,
          buffer_size: bufferSize ? Number(1000 * Number(bufferSize)) : undefined,
          folder,
          max_file_size: maxFileSize ? Number(1000 * Number(maxFileSize)) : undefined,
          rotate_every: rotateEvery ? Number(1000 * Number(rotateEvery)) : undefined,
          upload_every: uploadEvery ? Number(1000 * Number(uploadEvery)) : undefined
        });
        s3_stream.on('error', (error: any) => {
          console.log(`Error al crear conexion con s3: ${error.message}`);
        });
        const transporte = new winston.transports.Stream({
          stream: s3_stream
        });
        transportes.push(transporte);
      } catch (error: any) {
        console.log(`Error al crear conexion con s3: ${error.message}`);
      }
    }
    this.LoggerS3 = createLogger({
      level: LoggerS3.LOGGER_LEVEL,
      format: format.combine(...formt),
      transports: transportes,
      exitOnError: false
    }).on('error', (error: any) => {
      console.log(`Error al crear Logger: ${error.message}`);
    });
  }
  
  static getInstance(): LoggerS3 {
    LoggerS3.validarNivelLogger();
    if (!this.instance) {
      this.instance = new LoggerS3();
    }
    return this.instance;
  }

  public getLogger(): Logger {
    return this.LoggerS3;
  }

  private formatoLog = (info: TransformableInfo) => {
    const extendedInfo = info as ExtendedTransformableInfo;
    let log = '';
    const traceId = TraceId.obtenerTraceId();
    const mensajeTraceId = traceId ? `|TraceId: ${traceId}|` : '';
    try {
      const { servicios, TiempoTotal, mensajes } = this.transformacion(info);
      log = stringify({
        log_data: {
          fecha: extendedInfo.timestamp,
          Level: `${info.level}`.toUpperCase(),
          Mensaje: `${mensajeTraceId} ${this.limpiarCadena(`${info.message}`).replace(/"/g, '')} ${this.limpiarCadena(
            mensajes || ''
          ).replace(/"/g, '')}`.trim(),
          servicios,
          TiempoTotal
        }
      });
    } catch (error: any) {
      console.log(`Error al parsear: ${error.message}`);
      log = stringify({
        log_data: {
          fecha: extendedInfo.timestamp,
          Level: `${info.level}`.toUpperCase(),
          Mensaje: `${info.message}`,
          servicios: [],
          TiempoTotal: 0
        }
      });
    }
    return this.limpiarCadena(log);
  };

  private transformacion = (
    info: TransformableInfo
  ): { servicios: IFormatoServicio[]; mensajes?: string; TiempoTotal: number } => {
    const extendedInfo = info as ExtendedTransformableInfo;
    try {
      const splat = Symbol.for('splat') as unknown as string;
      const args = extendedInfo[splat];

      let argumentos: string[] = [];
      if (Array.isArray(args)) {
        argumentos = args.map((value) => stringify(value));
      } else {
        argumentos = [];
      }
      const medidorTiempo: IDetalleServicio[] | IDetalleServicio | null = JSON.parse(
        argumentos.find((arg) => this.esIDetalleServicio(arg)) || 'null'
      );
      const mensajes: string[] = [];
      const servicios: IDetalleServicio[] =
        medidorTiempo && Array.isArray(medidorTiempo) ? medidorTiempo : medidorTiempo ? [medidorTiempo] : [];
      const tiempoTotal = servicios.reduce((acumulador, servicio) => acumulador + Number(servicio.tiempo), 0);
      argumentos
      .filter((arg) => !this.esIDetalleServicio(arg))
      .forEach((arg) => mensajes.push(this.limpiarCadena(arg)));
      return {
        mensajes: mensajes.length > 0 ? mensajes.join(', ') : undefined,
        servicios: servicios.map(({ servicio, sistema, tiempo }) => ({ servicio, Sistema: sistema, Tiempo: tiempo })),
        TiempoTotal: Number(tiempoTotal)
      };
    } catch (error: any) {
      console.log(`Error al parsear el mensaje: ${error.message}`);
      return {
        mensajes: '',
        servicios: [],
        TiempoTotal: 0
      };
    }
  };

  private esIDetalleServicio = (arg: any): arg is IDetalleServicio => {
    try {
      const propiedades: string[] = ['servicio', 'sistema', 'tiempo'];
      const parse = JSON.parse(arg);
      if (Array.isArray(parse)) {
        return parse.every((obj) => Object.keys(obj).every((k) => propiedades.includes(k.toLowerCase())));
      }
      return Object.keys(parse).every((k) => propiedades.includes(k.toLowerCase()));
    } catch (error) {
      return false;
    }
  };

  private limpiarCadena = (cadena: string) =>
    cadena
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\\n')
    .replace(/\\'/g, "\\'")
    .replace(/\\"/g, '\\"')
    .replace(/\\&/g, '\\&')
    .replace(/\\r/g, '\\r')
    .replace(/\\t/g, '\\t')
    .replace(/\\b/g, '\\b')
    .replace(/\\f/g, '\\f');
}


/**
 * Logueo
 */

const logLikeFormat = {
  transform(info: TransformableInfo) {
	const extendedInfo = info as ExtendedTransformableInfo;
	const { label, message } = extendedInfo;
	const splat = Symbol.for('splat') as unknown as string;
	const mensaje = Symbol.for('message') as unknown as string;
	const args = extendedInfo[splat];
	const strArgs = Array.isArray(args) ? args.map((value) => stringify(value)).join(' ') : '';
	// eslint-disable-next-line no-param-reassign
	extendedInfo[mensaje] = `[${label}] ${message} ${strArgs}`;
	return info;
  }
};

// const debugFormat = {
//   transform(info: any) {
//     console.log(info);
//     return info;
//   },
// };

export const crearLogger = (module: NodeModule): Logger => {
  const formt: Format[] = [
	format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.sssZ' }),
	format.label({ label: path.basename(module.filename) }),
	format.printf((info: TransformableInfo) => {
	  const extendedInfo = info as ExtendedTransformableInfo;
	  logLikeFormat.transform(info);
	  const sym = Symbol.for('message') as unknown as string;
	  return `${extendedInfo.timestamp} [${info.level}] ${extendedInfo[sym]}`;
	})
  ];
  if (LoggerS3.LOGGER_COLOR) {
	formt.push(format.colorize({ all: true }));
  }
  return createLogger({
	level: LoggerS3.LOGGER_LEVEL,
	format: format.combine(...formt),
	transports: [new transports.Console()],
	exitOnError: false
  });
};

const logLikeFormatV2 = {
  transform(info: TransformableInfo): { servicios: IFormatoServicio[]; TiempoTotal: number } {
	const extendedInfo = info as ExtendedTransformableInfo;
	const splat = Symbol.for('splat') as unknown as string;
	const args = extendedInfo[splat];
	// const servicios = args ? JSON.parse(args.map(stringify)[0]) as unknown[] as IDetalleServicio[] : [];
	const servicios =
	  Array.isArray(args) && args.length > 0 ? (JSON.parse(stringify(args[0])) as unknown[] as IDetalleServicio[]) : [];
	let tiempoTotal = 0;
	if (Array.isArray(servicios) && servicios.length > 0) {
	  servicios.forEach((obj) => {
		tiempoTotal += obj?.tiempo ? Number(obj.tiempo) : 0;
	  });
	}
	return {
	  servicios: servicios.map(({ servicio, sistema, tiempo }) => ({ servicio, Sistema: sistema, Tiempo: tiempo })),
	  TiempoTotal: Number(tiempoTotal)
	};
  }
};

export const extendedInfo = (module: NodeModule): Logger => {
  // extendedInfo.timestamp
  const formt: Format[] = [
	format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss' }),
	format.label({ label: path.basename(module.filename) }),
	format.printf((info: TransformableInfo) => {
	  const extendedInfo = info as ExtendedTransformableInfo;
	  let log = '';
	  try {
		const { servicios, TiempoTotal } = logLikeFormatV2.transform(info);
		log = stringify({
		  log_data: {
			fecha: extendedInfo.timestamp,
			Level: `${info.level}`,
			Mensaje: `${info.message}`,
			servicios,
			TiempoTotal
		  }
		});
	  } catch (error: any) {
		log = stringify({
		  log_data: {
			fecha: extendedInfo.timestamp,
			Level: `${info.level}`.toUpperCase(),
			Mensaje: `${info.message}`,
			servicios: [],
			TiempoTotal: 0
		  }
		});
	  }
	  return log
	  .replace(/\\"/g, '"')
	  .replace(/\\n/g, '\\n')
	  .replace(/\\'/g, "\\'")
	  .replace(/\\"/g, '\\"')
	  .replace(/\\&/g, '\\&')
	  .replace(/\\r/g, '\\r')
	  .replace(/\\t/g, '\\t')
	  .replace(/\\b/g, '\\b')
	  .replace(/\\f/g, '\\f');
	})
  ];
  if (LoggerS3.LOGGER_COLOR) {
	formt.push(format.colorize({ all: true }));
  }
  return createLogger({
	level: LoggerS3.LOGGER_LEVEL,
	format: format.combine(...formt),
	transports: [new transports.Console(), new transports.File({ filename: 'combined.log' })],
	exitOnError: false
  });
};

/**
 * TraceId
 */


const { AsyncLocalStorage } = require('async_hooks');
export const asyncLocalStorage = new AsyncLocalStorage();

export class TraceId {
    static generarTraceId = (req: Request, res: Response, next: NextFunction): void => {
        try {
            const traceId = `${req.headers['x-trace-id']?.toString() || v4()}`.replace(/-/g, '').trim();
            asyncLocalStorage.run(new Map(), () => {
                asyncLocalStorage.getStore().set('requestId', traceId);
                res.setHeader('x-trace-id', traceId);
                next();
            });
        } catch (error: any) {
            LoggerS3.getInstance().getLogger().error(`Error al generar traceId: ${error.message}`);
            next();
        }
    }
    static obtenerTraceId = () => {
        let requestId = undefined;
        try {
            requestId = asyncLocalStorage.getStore()?.get('requestId');
        } catch (error: any) {
            LoggerS3.getInstance().getLogger().info(`Error al obtener traceId ${error?.message}`);
        }
        return requestId;
    }
    static limpiarTraceId = () => {
        try {
            asyncLocalStorage.getStore()?.delete('requestId');
        } catch (error: any) {
            LoggerS3.getInstance().getLogger().info(`Error al eliminar traceId ${error?.message}`);
        }
    }
}

/**
 * Traza peticion
 */


export class PeticionTraza {
  static calcularTiempoEjecucion = (param: { inicio: number; final?: number }) =>
	Math.trunc(param.final ? param.final - param.inicio : performance.now() - param.inicio);

  static isBase64 = (str: any) => {
	if (typeof str !== 'string' || str.length % 4 !== 0) {
	  return false;
	}
	const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
	return base64Regex.test(str);
  };
  
  static processObject = (objetoCopy: any) => {
	const obj = JSON.parse(JSON.stringify(objetoCopy));

	Object.keys(obj).forEach((key) => {
	  const value = obj[key];
	  if (typeof value === 'string' && PeticionTraza.isBase64(value)) {
		obj[key] = 'trucado';
	  } else if (typeof value === 'object' && value !== null) {
		PeticionTraza.processObject(value);
	  }
	});
	return obj;
  };
  
  static pintarTraza = (req: Request, res: Response, next: NextFunction) => {
	const { body, query, method, headers, ip, url } = req;
	const inicio = performance.now();
	res.locals.tiempoTotal = inicio;
	const bodyParseado = PeticionTraza.processObject(JSON.parse(JSON.stringify(body)));
	LoggerS3.getInstance()
	.getLogger()
	.info(
	  JSON.stringify({
		ip: ip,
		method: method,
		url: url,
		headers: headers,
		query: query,
		body: bodyParseado,
		message: 'Inicio de petición'
	  })
	);
	res.on('finish', () => {
	  LoggerS3.getInstance()
	  .getLogger()
	  .info(
		JSON.stringify({
		  status: res?.statusCode,
		  tiempo: Math.trunc(performance.now() - inicio),
		  message: 'Finalización de petición'
		})
	  );
	});

	res.on('close', () => {
	  if (!res.headersSent) {
		LoggerS3.getInstance()
		.getLogger()
		.info(
		  JSON.stringify({
			tiempo: PeticionTraza.calcularTiempoEjecucion({ inicio }),
			message: 'La conexión se cerró antes de tiempo'
		  })
		);
	  }
	});
	next();
  };
}