import { performance } from 'perf_hooks';
import { LoggerS3 } from '../middlewares';
import { AbstractConfiguration } from '../aws';
import { SistemasEnum } from '../enum';
import { calcularTiempoEjecucion } from '../utilerias';
import { IDetalleServicio } from '../models';
import mysql from 'mysql2/promise';


export interface ISPParams {
    nombre: string;
    parametros: unknown[];
}

export class ConfiguracionBaseDeDatos {
    private logger = LoggerS3.getInstance().getLogger();
    private static instance: ConfiguracionBaseDeDatos;

    static getInstance(): ConfiguracionBaseDeDatos {
        if (!this.instance) {
            this.instance = new ConfiguracionBaseDeDatos();
        }
        return this.instance;
    }

    getConexion = async (): Promise<mysql.Connection> => {
        const detalleServicio: IDetalleServicio[] = [];
        const inicio = performance.now();
        try {
            const params = AbstractConfiguration.PARAMS_DB_AURORA;
            const bdParams: mysql.ConnectionOptions = {
                host: params.host,
                port: params.puerto,
                user: params.usuario,
                password: params.password,
            };
            bdParams.database = params.base;
            const coneccion = await mysql.createConnection(bdParams);
            return coneccion;
        } catch (error) {
            console.log(error);
            const final = performance.now();
            detalleServicio.push({
                servicio: 'createConnection',
                sistema: SistemasEnum[SistemasEnum.AURORA],
                tiempo: calcularTiempoEjecucion({ inicio, final }),
            });
            this.logger.error(
                `No hay conexion a la base de datos de Aurora escritura`,
                detalleServicio,
            );
            throw new Error('Error al crear conexion getConexion');
        }
    };

    getConexionRo = async (): Promise<mysql.Connection> => {
        const detalleServicio: IDetalleServicio[] = [];
        const inicio = performance.now();
        try {
            const params = AbstractConfiguration.PARAMS_DB_AURORA_RO;
            const bdParams: mysql.ConnectionOptions = {
                host: params.host,
                port: params.puerto,
                user: params.usuario,
                password: params.password,
            };
            bdParams.database = params.base; // this.logger.debug(`BD PARAMS RO: ${JSON.stringify(bdParams)}`);
            const coneccion = await mysql.createConnection(bdParams);
            return coneccion;
        } catch (error) {
            console.log('🚀 ~ ConfiguracionBaseDeDatos ~ error:', error);
            const final = performance.now();
            detalleServicio.push({
                servicio: 'createConnection',
                sistema: SistemasEnum[SistemasEnum.AURORA],
                tiempo: calcularTiempoEjecucion({ inicio, final }),
            });
            this.logger.error(
                `No hay conexion a la base de datos de Aurora lectura`,
                detalleServicio,
            );
            throw new Error('Error al crear conexion getConexionRo');
        }
    };

    pruebaConexion = async (): Promise<void> => {
        const detalleServicio: IDetalleServicio[] = [];
        const inicio = performance.now();
        try {
            const conn = await this.getConexion();
            await conn.connect();
            await conn.end();
        } catch (error) {
            const final = performance.now();
            detalleServicio.push({
                servicio: 'connect',
                sistema: SistemasEnum[SistemasEnum.AURORA],
                tiempo: calcularTiempoEjecucion({ inicio, final }),
            });
            this.logger.error(`No hay conexion a la instancia de escritura`, detalleServicio);
            throw new Error(`<<<< NO HAY CONEXIÓN CON LA BD >>> \n${error}`);
        }
    };

    pruebaConexionRo = async (): Promise<void> => {
        const detalleServicio: IDetalleServicio[] = [];
        const inicio = performance.now();
        try {
            const conn = await this.getConexionRo();
            await conn.connect();
            await conn.end();
        } catch (error) {
            const final = performance.now();
            detalleServicio.push({
                servicio: 'connect',
                sistema: SistemasEnum[SistemasEnum.AURORA],
                tiempo: calcularTiempoEjecucion({ inicio, final }),
            });
            this.logger.error(`No hay conexion a la instancia de lectura`, detalleServicio);
            throw new Error(`<<<< NO HAY CONEXIÓN CON LA BD >>> \n${error}`);
        }
    };

    ejecutarSP = async <T>(spParams: ISPParams): Promise<T[]> => {
        const detalleServicio: IDetalleServicio[] = [];
        let conn;
        try {
            conn = await this.getConexion();
        } catch (error) {
            throw new Error('Error al adquirir la conexion BD');
        }
        const inicio = performance.now();
        try {
            const respuesta = await conn.execute(spParams.nombre, spParams.parametros);
            const final = performance.now();
            detalleServicio.push({
                servicio: 'execute',
                sistema: SistemasEnum[SistemasEnum.AURORA],
                tiempo: calcularTiempoEjecucion({ inicio, final }),
            });
            this.logger.info(
                `Ejecucion correcta sp:${
                    spParams.nombre
                }, parametros: ${spParams.parametros.toString()}`,
                detalleServicio,
            );
            return ((respuesta as unknown[])[0] as unknown[])[0] as T[];
        } catch (error: any) {
            const final = performance.now();
            detalleServicio.push({
                servicio: 'execute',
                sistema: SistemasEnum[SistemasEnum.AURORA],
                tiempo: calcularTiempoEjecucion({ inicio, final }),
            });
            this.logger.error(
                `Error al ejecutar sp:${
                    spParams.nombre
                }, parametros: ${spParams.parametros.toString()}, detalle: ${error?.message}`,
                detalleServicio,
            );
            throw new Error(`Error al ejecutar sp: ${spParams.nombre}`);
        } finally {
            try {
                await conn.end();
            } catch (error) {
                // this.logger.error('Error al liberar la conexión de BD', error);
            }
        }
    };

    ejecutarSpRO = async <T>(spParams: ISPParams): Promise<T[]> => {
        const detalleServicio: IDetalleServicio[] = [];
        let conn;
        try {
            conn = await this.getConexionRo();
        } catch (error) {
            throw new Error('Error al adquirir la conexion BD');
        }
        const inicio = performance.now();
        try {
            const respuesta = await conn.execute(spParams.nombre, spParams.parametros);
            const final = performance.now();
            detalleServicio.push({
                servicio: 'execute',
                sistema: SistemasEnum[SistemasEnum.AURORA],
                tiempo: calcularTiempoEjecucion({ inicio, final }),
            });
            this.logger.info(
                `Ejecucion correcta sp:${
                    spParams.nombre
                }, parametros: ${spParams.parametros.toString()}`,
                detalleServicio,
            );
            return ((respuesta as unknown[])[0] as unknown[])[0] as T[];
        } catch (error: any) {
            const final = performance.now();
            detalleServicio.push({
                servicio: 'execute',
                sistema: SistemasEnum[SistemasEnum.AURORA],
                tiempo: calcularTiempoEjecucion({ inicio, final }),
            });
            this.logger.error(
                `Error al ejecutar sp:${
                    spParams.nombre
                }, parametros: ${spParams.parametros.toString()}, detalle: ${error?.message}`,
                detalleServicio,
            );
            throw new Error(`Error al ejecutar sp: ${spParams.nombre}`);
        } finally {
            try {
                await conn.end();
            } catch (error) {
                // this.logger.error('Error al liberar la conexión de BD', error);
            }
        }
    };
}

export * from '.';
