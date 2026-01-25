import mongoose, {  } from 'mongoose';
import { Request, Response } from 'express';
import { Schema, Model } from "mongoose";
import { LoggerS3 } from '../middlewares';
import { exitoApi, errorApi } from '../respuestas';
import { AbstractConfiguration } from '../aws';

export enum EOperacionDocument {
	FIND = 0,
	SAVE = 1,
	DELETE = 2,
}
export interface IParamsDocument {
  nameModel: string,
  schema: Schema<any, Model<any, any, any>, undefined> | undefined,
  collection: string | undefined,
  parametros: any
}
export class ConfiguracionBaseDeDatosDocument {
  private static instance: ConfiguracionBaseDeDatosDocument;
  private readonly logger = LoggerS3.getInstance().getLogger();

  // eslint-disable-next-line no-useless-constructor, @typescript-eslint/no-empty-function
  private constructor() { }

  static getInstance(): ConfiguracionBaseDeDatosDocument {
    if (!this.instance) {
      this.instance = new ConfiguracionBaseDeDatosDocument();
    }
    return this.instance;
  }
  private fixMongoUri= (uri: string) => {
    // Extrae la parte de usuario:contraseña y el resto
    const regex = /(mongodb(?:\+srv)?):\/\/([^:]+):([^@]+)@(.+)/;
    const match = uri.match(regex);
    if (!match) return uri; // no se puede parsear, devuelve igual
    const [, protocol, user, password, rest] = match;
    const passwordEscaped = encodeURIComponent(password);
    return `${protocol}://${user}:${passwordEscaped}@${rest}`;
  }

  inicializar = async (): Promise<void> => {
    try {
      const uri = this.fixMongoUri(AbstractConfiguration.BD_URL_DOCUMENT);
      // console.log("🚀 ~ ConfiguracionBaseDeDatosDocument ~ AbstractConfiguration.BD_URL_DOCUMENT:", AbstractConfiguration.BD_URL_DOCUMENT)
      await mongoose.connect(uri, {
        tls: true,
        tlsAllowInvalidCertificates: true,
        minPoolSize: 20, // mantiene 20 activas
        maxPoolSize: 40,
        maxIdleTimeMS: 60000, // cierra conexiones inactivas después de 1 minut
      });
      this.logger.info('<<<< Conexión exitosa a la base de datos >>>>');
    } catch (error) {
      console.log("🚀 ~ ConfiguracionBaseDeDatosDocument ~ error:", error)
      this.logger.error(`Error de conexión a la BD: ${error}`);
      throw new Error('Error de conexión a la base de datos');
    }
  }

  desconectar = async (solicitud: Request, respuesta: Response): Promise<Response> => {
    try {
      await mongoose.disconnect();
      return exitoApi.exito(respuesta, { mensaje: 'Base de datos desconectada exitosamente' });
    } catch (error) {
      this.logger.error('Error al cerrar conexiones de BD: ', error);
      throw errorApi.errorInternoServidor.bd('Ocurrió un error al cerrar las conexiones de BD');
    }
  }

  desconectarLocal = async (): Promise<void> => {
    try {
      await mongoose.disconnect();
      this.logger.info('Base de datos desconectada exitosamente');
    } catch (error) {
      this.logger.error('Error al cerrar conexiones de BD: ', error);
    }
  }
}

export * from '.';
