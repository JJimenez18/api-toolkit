import { LoggerS3 } from "../middlewares";
import { obtenerParametroSSMRaw, obtenerSecretoAWS } from "./aws-utils"; // Las funciones que hicimos antes

export interface IVariableEntorno {
  id: number;
  descripcion: string;
  valor: string;
}

export interface ISSMConfig {
  URL_BASE_HTAS?: string;
  PUERTO_DEFAULT?: string;
  VARIABLES?: string;
  [key: string]: string | undefined;
}

export interface ISNConfig {
  CON_AURORA_DB?: string;
  CON_AURORA_DB_RO?: string;
  // URL_DOC: string;
  [key: string]: string | undefined;
}

export interface IInitOptions {
  // Usamos la nueva interfaz aquí
  ssmNames?: ISSMConfig;
  secretNames?: ISNConfig;
}

export interface IParametrosBD {
  host: string;
  puerto: number;
  usuario: string;
  password: string;
  conexiones?: number;
  base?: string;
}

interface IValidationRules<T> {
  requiredStrings?: (keyof T)[];
  requiredInts?: (keyof T)[];
}

export interface ICredencialesModel {
  id: number;
  usuario: string;
  password: string;
}

export abstract class AbstractConfiguration {
  protected static logger = LoggerS3.getInstance().getLogger();

  private static storage: Map<string, string> = new Map();

  public static APP_PUERTO: string;
  public static APP_RUTA_BASE: string;
  public static URL_BASE_HERRAMIENTAS: string;
  public static CONFIGURACION_LOG: string;
  public static BD_URL_DOCUMENT: string;
  public static PARAMS_DB_AURORA: IParametrosBD;
  public static PARAMS_DB_AURORA_RO: IParametrosBD;

  public static async inicializarBase(options: IInitOptions): Promise<void> {
    this.logger.info("⚙️ Toolkit: Iniciando carga de configuración...");

    const promesas: Promise<void>[] = [];
    // falta cambiar que se lean desde el process.env

    options.ssmNames = {
      ...options.ssmNames,
      URL_BASE_HTAS: "URL_DNS_HERRAMIENTAS",
      PUERTO_DEFAULT: "/COMUN/APP_PUERTO",
    };

    const SECRET_NAME = "/fusion/PARAMS_DB_AURORA";
    const SECRET_NAME_RO = "/fusion/PARAMS_DB_AURORA_RO";
    options.secretNames = {
      ...options.secretNames,
      CON_AURORA_DB: SECRET_NAME,
      CON_AURORA_DB_RO: SECRET_NAME_RO,
    };
    // console.log("🚀 ~ AbstractConfiguration ~ inicializarBase ~ options.secretNames:", options.secretNames)
    // console.log(
    //     '🚀 ~ AbstractConfiguration ~ inicializarBase ~ options.ssmNames:',
    //     options.ssmNames,
    // );
    if (options.ssmNames) {
      const lista = Object.entries(options.ssmNames);
      const p = Promise.all(
        lista.map(async ([alias, awsPath]) => {
          try {
            const val = await obtenerParametroSSMRaw(awsPath || "");
            this.storage.set(alias, val);
          } catch (e) {
            this.logger.error(`Error cargando SSM [${alias}]: ${e}`);
            throw e;
          }
        })
      ).then(() => {}); // void return
      promesas.push(p);
    }

    if (options.secretNames) {
      const lista = Object.entries(options.secretNames);
      const p = Promise.all(
        lista.map(async ([alias, awsPath]) => {
          try {
            const val = await obtenerSecretoAWS(awsPath || '');
            this.storage.set(alias, val);
          } catch (e) {
            this.logger.error(`Error cargando Secret [${alias}]: ${e}`);
            throw e;
          }
        })
      ).then(() => {});
      promesas.push(p);
    }
    await Promise.all(promesas);
    await this.inicializaVariablesDefault();
    this.logger.info(
      `✅ Toolkit: Carga completa. ${this.storage.size} variables en memoria.`
    );
  }

  private static inicializaVariablesDefault = async () => {
    AbstractConfiguration.APP_PUERTO = process.env.LOCAL
      ? `${process.env.APP_PUERTO}`
      : this.getString("PUERTO_DEFAULT");
    AbstractConfiguration.URL_BASE_HERRAMIENTAS =
      this.getString("URL_BASE_HTAS");
    AbstractConfiguration.BD_URL_DOCUMENT = this.getString("URL_DOC");
    this.validarYAsignarDB("CON_AURORA_DB", "PARAMS_DB_AURORA");
    this.validarYAsignarDB("CON_AURORA_DB_RO", "PARAMS_DB_AURORA_RO");
  };

  
  protected static setConfig(config: { rutaBase: string; puerto?: string }) {
    AbstractConfiguration.APP_RUTA_BASE = config.rutaBase;

    if (config.puerto) {
      AbstractConfiguration.APP_PUERTO = config.puerto;
    }
  }

  protected static getString(alias: string): string {
    const val = this.storage.get(alias);
    if (val === undefined) {
      throw new Error(
        `Config Error: La variable '${alias}' no fue definida o no se pudo cargar.`
      );
    }
    return val;
  }

  protected static getJson<T>(alias: string): T {
    const val = this.getString(alias);
    try {
      return JSON.parse(val) as T;
    } catch (error) {
      throw new Error(
        `Config Error: La variable '${alias}' no es un JSON válido. Valor recibido: ${val.substring(
          0,
          20
        )}...`
      );
    }
  }

  protected static bindProperties(aliasJson: string, properties: string[]) {
    const lista = this.getJson<any[]>(aliasJson);

    if (!Array.isArray(lista)) {
      throw new Error(
        `Toolkit: El alias '${aliasJson}' no es un array válido.`
      );
    }

    properties.forEach((propName) => {
      const item = lista.find((i) => i.descripcion === propName);

      if (!item) {
        throw new Error(
          `Toolkit Bind: No se encontró la variable con descripción '${propName}' en '${aliasJson}'`
        );
        // Opción B: Warning y continuar (si es opcional)
        // this.logger.warn(`Variable ${propName} no encontrada`); return;
      }

      // Asignación Dinámica: this['NOMBRE_VAR'] = 'valor'
      (this as any)[propName] = item.valor;
    });
  }

  protected static getLegacyIdValue(
    aliasJsonArray: string,
    id: number
  ): string {
    const lista = this.getJson<any[]>(aliasJsonArray);
    if (!Array.isArray(lista))
      throw new Error(`Config Error: '${aliasJsonArray}' no es un array.`);

    const item = lista.find((i) => i.id === id);
    if (!item)
      throw new Error(
        `Config Error: ID ${id} no encontrado en '${aliasJsonArray}'`
      );

    return item.valor;
  }

  protected static getValueByName(
    aliasJson: string,
    descriptionKey: string
  ): string {
    const lista = this.getJson<any[]>(aliasJson);
    // console.log('🚀 ~ AbstractConfiguration ~ getValueByName ~ lista:', lista);
    const item = lista.find((i) => i.descripcion === descriptionKey);

    if (!item)
      throw new Error(
        `Variable con descripción '${descriptionKey}' no encontrada en '${aliasJson}'`
      );

    return item.valor;
  }

  protected static bindValidatedJson<T>(
    ssmAlias: string,
    targetProperty: string,
    rules: IValidationRules<T> = {}
  ): void {
    const data = this.getJson<T>(ssmAlias);

    if (rules.requiredStrings) {
      rules.requiredStrings.forEach((field) => {
        const val = data[field];
        if (typeof val !== "string" || val.trim() === "") {
          throw new Error(
            `Config Error: El campo '${String(
              field
            )}' en '${ssmAlias}' es obligatorio y debe ser texto.`
          );
        }
      });
    }

    if (rules.requiredInts) {
      rules.requiredInts.forEach((field) => {
        const val = data[field];
        if (typeof val !== "number" || !Number.isInteger(val)) {
          throw new Error(
            `Config Error: El campo '${String(
              field
            )}' en '${ssmAlias}' debe ser un número entero.`
          );
        }
      });
    }

    (this as any)[targetProperty] = data;
    this.logger.info(
      `✅ Variable '${targetProperty}' cargada y validada desde '${ssmAlias}'`
    );
  }

  protected static validarCredenciales(
    alias: string,
    targetProperty: string
  ): void {
    this.getString(alias);
    try {
      const data = this.getJson<any[]>(
        alias
      ) as unknown as ICredencialesModel[];
      (this as any)[targetProperty] = data;
    } catch (error) {
      throw new Error("La variable credenciales debe ser un JSON");
    }
  }

  private static validarYAsignarDB(
    alias: string,
    targetProp: "PARAMS_DB_AURORA" | "PARAMS_DB_AURORA_RO"
  ) {
    const data = this.getJson<IParametrosBD>(alias);

    const requiredStrings = ["host", "usuario", "password"];
    const requiredInts = ["puerto"];

    requiredStrings.forEach((field) => {
      const val = (data as any)[field];
      if (typeof val !== "string" || val.trim() === "") {
        throw new Error(`Config Error: '${alias}.${field}' es obligatorio.`);
      }
    });

    requiredInts.forEach((field) => {
      const val = (data as any)[field];
      if (typeof val !== "number" || !Number.isInteger(val)) {
        throw new Error(`Config Error: '${alias}.${field}' debe ser entero.`);
      }
    });

    AbstractConfiguration[targetProp] = data;
    this.logger.info(
      `✅ Variable '${targetProp}' asignada a AbstractConfiguration`
    );
  }
}

export * from ".";
