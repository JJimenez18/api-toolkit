import winston, { createLogger, format, transports } from "winston";
import stringify from "fast-safe-stringify";
import { AbstractConfiguration } from "../aws/AbstractConfiguration";
import { TraceId } from "./TraceId";

const { S3StreamLogger } = require("s3-streamlogger");

interface IConfiguracionLog {
  bucket: string;
  folder?: string;
  nameFormat?: string;
  bufferSize?: string;
  maxFileSize?: string;
  rotateEvery?: string;
  uploadEvery?: string;
}

export class LoggerS3 {
  private static instance: LoggerS3;
  private logger: winston.Logger;
  private static _configCache: IConfiguracionLog | null = null;

  static get CONFIGURACION_LOG(): IConfiguracionLog {
    if (this._configCache) return this._configCache;
    let config: IConfiguracionLog = { bucket: "" };
    try {
      if (
        typeof AbstractConfiguration !== "undefined" &&
        AbstractConfiguration.CONFIGURACION_LOG
      ) {
        const raw = `${AbstractConfiguration.CONFIGURACION_LOG}`.trim();
        if (raw) {
          config = JSON.parse(raw.replace(/[']+/g, '"'));
          config.bucket = AbstractConfiguration.S3_BUCKET_LOGS || config.bucket;
          this._configCache = config;
        }
      }
    } catch (e) {
      console.error("Error parseando config logs:", e);
    }
    return config;
  }

  public static recargarConfiguracion(): void {
    LoggerS3._configCache = null;
    if (LoggerS3.instance) {
      LoggerS3.instance = new LoggerS3();
    }
    LoggerS3.getInstance();
    console.log("LoggerS3 reiniciado con configuración actualizada.");
  }

  static getInstance(): LoggerS3 {
    if (!this.instance) this.instance = new LoggerS3();
    return this.instance;
  }

  public getLogger(): winston.Logger {
    return this.logger;
  }

  private formatoLogV2 = format.printf((info) => {
    const traceId = TraceId.obtenerTraceId();
    const prefixTrace = traceId ? `|TraceId: ${traceId}|` : "";
    const servicios = info.servicios || [];
    const tiempoTotal = info.TiempoTotal || 0;
    const mensajeLimpio = `${info.message}`.replace(/"/g, "'").trim();

    const logOutput = {
      log_data: {
        fecha: info.timestamp,
        Level: info.level.toUpperCase(),
        Mensaje: `${prefixTrace} ${mensajeLimpio}`.trim(),
        servicios: servicios,
        TiempoTotal: Number(tiempoTotal),
      },
    };

    return stringify(logOutput);
  });

    private formatoLog = format.printf((info) => {
    const traceId = TraceId.obtenerTraceId();
    const prefixTrace = traceId ? `|TraceId: ${traceId}|` : "";
    
    // --- CAMBIO AQUÍ ---
    // Si pasas el arreglo directo, Winston a veces lo guarda en info[Symbol.for('splat')] 
    // o simplemente añade las propiedades al objeto info si pasas un objeto.
    // Para capturar el arreglo que envías:
    const metadata = info[Object.getOwnPropertySymbols(info).find(s => s.toString() === 'Symbol(splat)') as any];
    const servicios = info.servicios || (Array.isArray(metadata) ? metadata[0] : []);
    
    // Si envías el tiempo total como parte de un objeto de metadatos
    const mensajeLimpio = `${info.message}`.replace(/"/g, "'").trim();

    const tiempoTotal = Array.isArray(servicios) 
      ? servicios.reduce((acc: number, s: any) => acc + (Number(s.tiempo) || 0), 0)
      : 0;
      
    const logOutput = {
      log_data: {
        fecha: info.timestamp,
        Level: info.level.toUpperCase(),
        Mensaje: `${prefixTrace} ${mensajeLimpio}`.trim(),
        servicios: servicios, // Ahora debería traer el array
        TiempoTotal: Number(tiempoTotal),
      },
    };

    return stringify(logOutput);
  });


  constructor() {
    const config = LoggerS3.CONFIGURACION_LOG;

    const transportes: winston.transport[] = [new transports.Console()];

    const {
      bucket,
      bufferSize,
      folder,
      maxFileSize,
      nameFormat,
      rotateEvery,
      uploadEvery,
    } = LoggerS3.CONFIGURACION_LOG;

    if (config.bucket) {
      try {
        const s3Opts: any = {
          bucket,
          name_format: nameFormat, // || `${AbstractConfiguration.API_NOMBRE}.txt`,
          buffer_size: bufferSize
            ? Number(1000 * Number(bufferSize))
            : undefined,
          folder,
          max_file_size: maxFileSize
            ? Number(1000 * Number(maxFileSize))
            : undefined,
          rotate_every: rotateEvery
            ? Number(1000 * Number(rotateEvery))
            : undefined,
          upload_every: uploadEvery
            ? Number(1000 * Number(uploadEvery))
            : undefined,
        };
        if (process.env.AWS_ACCESS_KEY_ID) {
          s3Opts.access_key_id = process.env.AWS_ACCESS_KEY_ID;
          s3Opts.secret_access_key = process.env.AWS_SECRET_ACCESS_KEY;
        }
        const s3Stream = new S3StreamLogger(s3Opts);
        s3Stream.on("error", (e: any) => console.log("S3 Error:", e.message));
        transportes.push(new winston.transports.Stream({ stream: s3Stream }));
      } catch (e) {
        console.log("Error S3 init");
      }
    }

    this.logger = createLogger({
      level: process.env.LOGGER_LEVEL || "debug",
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss" }),
        this.formatoLog
      ),
      transports: transportes,
      exitOnError: false,
    });
  }
}
