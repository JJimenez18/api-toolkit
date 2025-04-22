import axios, {AxiosRequestConfig} from 'axios';
import {SistemasEnum, EMensajesError} from '../enum/enums';
import {IDetalleServicio} from '../models/model';
import {iniciaTiempo, calculaTiempo} from './validadores-utils';

enum LoggerLevelsEnum {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    VERBOSE = 'verbose',
    DEBUG = 'debug',
  }

interface ISendRequest<T> {
    codigoHttp: number;
    detalles: string;
    resultado?: T;
    detalleServicio: IDetalleServicio[];
}

export const sendRequestGral = async <T>(
    config: AxiosRequestConfig,
    nombreServicio: string,
    inDetServicio?: IDetalleServicio[]
): Promise<ISendRequest<T>> => {
    const detService: [string, SistemasEnum, number] = [nombreServicio, SistemasEnum.AXIOS, iniciaTiempo()];
    try {
        const resp = await axios.request(config);
        delete config.auth;
        delete config.headers.Authorization;
        const detalleServicio = calculaTiempo(
            detService,
            `Ejecutanto peticion Axios, Config: ${JSON.stringify(config)} Response: ${JSON.stringify(resp.data)}}`,
            LoggerLevelsEnum.INFO,
            inDetServicio
        );
        return {
            codigoHttp: 200,
            detalles: 'ok',
            resultado: resp.data as T,
            detalleServicio,
        };
    } catch (error: any) {
        const detalleServicio = calculaTiempo(
            detService,
            `Problemas al ejecutar peticion Axios, Config: ${JSON.stringify(config)}, Response: ${JSON.stringify(
                error.message || error
            )}`,
            LoggerLevelsEnum.ERROR,
            inDetServicio
        );
        return {
            codigoHttp: 500,
            detalles: error.message || EMensajesError.ERROR,
            detalleServicio,
        };
    }
};
