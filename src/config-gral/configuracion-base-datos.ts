import { performance } from "perf_hooks";
import { LoggerS3 } from "../middlewares";
import { AbstractConfiguration, IParametrosBD } from "../aws";
import { SistemasEnum } from "../enum";
import { calcularTiempoEjecucion, Telegram } from "../utilerias";
import { IDetalleServicio } from "../models";
import mysql from "mysql2/promise";

export interface ISPParams {
  nombre: string;
  parametros: unknown[];
}

export type TipoOperacionBD = "LECTURA" | "ESCRITURA";

export class ConfiguracionBaseDeDatos {
  private logger = LoggerS3.getInstance().getLogger();
  private static instance: ConfiguracionBaseDeDatos;

  static getInstance(): ConfiguracionBaseDeDatos {
    if (!this.instance) {
      this.instance = new ConfiguracionBaseDeDatos();
    }
    return this.instance;
  }

  private getConexion = async (
    conection: IParametrosBD
  ): Promise<mysql.Connection> => {
    const detalleServicio: IDetalleServicio[] = [];
    const inicio = performance.now();
    try {
      const params = conection;
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
        servicio: "createConnection",
        sistema: SistemasEnum[SistemasEnum.AURORA],
        tiempo: calcularTiempoEjecucion({ inicio, final }),
      });
      this.logger.error(
        `No hay conexion a la base de datos de Aurora escritura`,
        detalleServicio
      );
      throw new Error("Error al crear conexion getConexion");
    }
  };

  pruebaConexion = async (conection: IParametrosBD): Promise<void> => {
    const detalleServicio: IDetalleServicio[] = [];
    const inicio = performance.now();
    try {
      const conn = await this.getConexion(conection);
      await conn.connect();
      await conn.end();
    } catch (error) {
      const final = performance.now();
      detalleServicio.push({
        servicio: "connect",
        sistema: SistemasEnum[SistemasEnum.AURORA],
        tiempo: calcularTiempoEjecucion({ inicio, final }),
      });
      this.logger.error(
        `No hay conexion a la instancia de escritura`,
        detalleServicio
      );
      throw new Error(`<<<< NO HAY CONEXIÓN CON LA BD >>> \n${error}`);
    }
  };

  ejecutarSP = async <T>(
    spParams: ISPParams,
    conection: IParametrosBD = AbstractConfiguration.PARAMS_DB_AURORA
  ): Promise<T[]> => {
    const detalleServicio: IDetalleServicio[] = [];
    let conn;
    try {
      conn = await this.getConexion(conection);
    } catch (error) {
      throw new Error("Error al adquirir la conexion BD");
    }
    const inicio = performance.now();
    try {
      const respuesta = await conn.execute(
        spParams.nombre,
        spParams.parametros
      );
      const final = performance.now();
      detalleServicio.push({
        servicio: "execute",
        sistema: SistemasEnum[SistemasEnum.AURORA],
        tiempo: calcularTiempoEjecucion({ inicio, final }),
      });
      this.logger.info(
        `Ejecucion correcta sp:${
          spParams.nombre
        }, parametros: ${spParams.parametros.toString()}`,
        detalleServicio
      );
      return ((respuesta as unknown[])[0] as unknown[])[0] as T[];
    } catch (error: any) {
      const final = performance.now();
      detalleServicio.push({
        servicio: "execute",
        sistema: SistemasEnum[SistemasEnum.AURORA],
        tiempo: calcularTiempoEjecucion({ inicio, final }),
      });
      this.logger.error(
        `Error al ejecutar sp:${
          spParams.nombre
        }, parametros: ${spParams.parametros.toString()}, detalle: ${
          error?.message
        }`,
        detalleServicio
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

  ejecutarSpRO = async <T>(
    spParams: ISPParams,
    conection: IParametrosBD = AbstractConfiguration.PARAMS_DB_AURORA_RO
  ): Promise<T[]> => {
    const detalleServicio: IDetalleServicio[] = [];
    let conn;
    try {
      conn = await this.getConexion(conection);
    } catch (error) {
      throw new Error("Error al adquirir la conexion BD");
    }
    const inicio = performance.now();
    try {
      const respuesta = await conn.execute(
        spParams.nombre,
        spParams.parametros
      );
      const final = performance.now();
      detalleServicio.push({
        servicio: "execute",
        sistema: SistemasEnum[SistemasEnum.AURORA],
        tiempo: calcularTiempoEjecucion({ inicio, final }),
      });
      this.logger.info(
        `Ejecucion correcta sp:${
          spParams.nombre
        }, parametros: ${spParams.parametros.toString()}`,
        detalleServicio
      );
      return ((respuesta as unknown[])[0] as unknown[])[0] as T[];
    } catch (error: any) {
      const final = performance.now();
      detalleServicio.push({
        servicio: "execute",
        sistema: SistemasEnum[SistemasEnum.AURORA],
        tiempo: calcularTiempoEjecucion({ inicio, final }),
      });
      this.logger.error(
        `Error al ejecutar sp:${
          spParams.nombre
        }, parametros: ${spParams.parametros.toString()}, detalle: ${
          error?.message
        }`,
        detalleServicio
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

  runSP = async <T>(
    spParams: ISPParams,
    tipoOperacion: TipoOperacionBD = "ESCRITURA",
    parametrosCustom?: IParametrosBD
  ): Promise<T[]> => {
    this.logger.info(
      `ConfiguracionBaseDeDatos ~ tipoOperacion: ${tipoOperacion}`
    );
    const detalleServicio: IDetalleServicio[] = [];
    let conn;

    const credencialesBD =
      parametrosCustom ||
      (tipoOperacion === "LECTURA"
        ? AbstractConfiguration.PARAMS_DB_AURORA_RO
        : AbstractConfiguration.PARAMS_DB_AURORA);

    try {
      conn = await this.getConexion(credencialesBD);
    } catch (error) {
      throw new Error("Error al adquirir la conexion BD");
    }

    const inicio = performance.now();
    try {
      const respuesta = await conn.execute(
        spParams.nombre,
        spParams.parametros
      );
      const final = performance.now();

      detalleServicio.push({
        servicio: "execute",
        sistema: SistemasEnum[SistemasEnum.AURORA],
        tiempo: calcularTiempoEjecucion({ inicio, final }),
      });

      const resp = ((respuesta as unknown[])[0] as unknown[])[0] as T[];

      this.logger.info(
        `Ejecucion correcta sp:${
          spParams.nombre
        }, parametros: ${spParams.parametros.toString()}, respuesta: ${JSON.stringify(
          resp
        )}`,
        detalleServicio
      );

      return resp;
    } catch (error: any) {
      const final = performance.now();
      detalleServicio.push({
        servicio: "execute",
        sistema: SistemasEnum[SistemasEnum.AURORA],
        tiempo: calcularTiempoEjecucion({ inicio, final }),
      });

      this.logger.error(
        `Error al ejecutar sp:${
          spParams.nombre
        }, parametros: ${spParams.parametros.toString()}, detalle: ${
          error?.message
        }`,
        detalleServicio
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

   public ejecutarSPOut = async (spParams: ISPParams): Promise<{data:any | null}> => {
      const detalleServicio: IDetalleServicio[] = [];
      let conn;
      try {
        conn = await this.getConexion(AbstractConfiguration.PARAMS_DB_AURORA);
      } catch (error) {
        throw new Error('Error al adquirir la conexion BD');
      }
      const inicio = performance.now();
      try {
        const { parametros, nombre } = spParams;
        await conn.execute(nombre, parametros);
        const [outputs] = await conn.query(`SELECT ${nombre.split(',').filter((p) => p.includes('@')).join(',').replace(')', '')};`);
        return Array.isArray(outputs) ? { data: outputs[0] } : { data: null };
      } catch (error: any) {
        const final = performance.now();
        detalleServicio.push({ servicio: 'execute', sistema: SistemasEnum[SistemasEnum.AURORA], tiempo: calcularTiempoEjecucion({ inicio, final }) });
        this.logger.error(`Error al ejecutar sp:${spParams.nombre}, detalle: ${error?.message}`, detalleServicio);
        // this.logger.error(`Error al ejecutar sp:${spParams.nombre}, parametros: ${spParams.parametros.toString()}, detalle: ${error?.message}`, detalleServicio);
        await Telegram.getInstance().enviarNotificacion(
          `${JSON.stringify(spParams.nombre)}, ${JSON.stringify(spParams.parametros)}, ${JSON.stringify(error.message)}`
        ).catch((err)=>(console.log(err)));
        throw new Error(`Error al ejecutar sp: ${spParams.nombre}`);
      } finally {
        conn.end();
      }
    }
}

export * from ".";
