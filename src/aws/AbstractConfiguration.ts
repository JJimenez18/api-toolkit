import { LoggerS3 } from "../middlewares";
import { obtenerParametroSSMRaw, obtenerSecretoAWS } from "./aws-utils";

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
  URL_DOC?: string;
  CREDENTIALS_SISTEM?: string;
  [key: string]: string | undefined;
}

export interface IInitOptions {
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

export interface IConfigInjection {
  key: string;
  valor: any;
}

export abstract class AbstractConfiguration {
  protected static logger = LoggerS3.getInstance().getLogger();
  private static storage: Map<string, string> = new Map();

  // --- Variables de Infraestructura
  public static APP_PUERTO: string;
  public static APP_RUTA_BASE: string;
  public static URL_BASE_HERRAMIENTAS: string;
  public static CONFIGURACION_LOG: string;
  public static BD_URL_DOCUMENT: string;

  // Variables de DB Globales
  public static PARAMS_DB_AURORA: IParametrosBD;
  public static PARAMS_DB_AURORA_RO: IParametrosBD;
  public static CREDENCIALES: ICredencialesModel[];

  /**
   * Carga masiva de parámetros desde AWS (SSM y Secrets Manager) en paralelo.
   * Guarda todo en memoria 'raw' para ser procesado después.
   */
  public static async inicializarBase(options: IInitOptions): Promise<void> {
    this.logger.info("⚙️ Toolkit: Iniciando carga de configuración...");

    const promesas: Promise<void>[] = [];

    options.ssmNames = {
      ...options.ssmNames,
      URL_BASE_HTAS: "URL_DNS_HERRAMIENTAS",
      PUERTO_DEFAULT: "/COMUN/APP_PUERTO",
    };

    options.secretNames = {
      ...options.secretNames,
      CON_AURORA_DB: "/fusion/PARAMS_DB_AURORA",
      CON_AURORA_DB_RO: "/fusion/PARAMS_DB_AURORA_RO",
    };

    if (options.ssmNames) {
      const lista = Object.entries(options.ssmNames);
      const p = Promise.all(
        lista.map(async ([alias, awsPath]) => {
          try {
            if (!awsPath) return;
            const val = await obtenerParametroSSMRaw(awsPath);
            this.storage.set(alias, val);
            // LOG SEGURO: Solo decimos QUE cargamos, no el valor
            this.logger.debug(`Loaded SSM: [${alias}] -> ${awsPath}`);
          } catch (e) {
            this.logger.error(`Error cargando SSM [${alias}]: ${e}`);
            throw e;
          }
        })
      ).then(() => {});
      promesas.push(p);
    }

    if (options.secretNames) {
      const lista = Object.entries(options.secretNames);
      const p = Promise.all(
        lista.map(async ([alias, awsPath]) => {
          try {
            const val = await obtenerSecretoAWS(awsPath || "");
            this.storage.set(alias, val);
            this.logger.debug(`Loaded Secret: [${alias}]`);
          } catch (e) {
            this.logger.error(`Error cargando Secret [${alias}]: ${e}`);
            throw e;
          }
        })
      ).then(() => {});
      promesas.push(p);
    }

    await Promise.all(promesas);

    this.inicializaVariablesDefault();

    this.logger.info(
      `✅ Toolkit: Carga completa. ${this.storage.size} variables en memoria.`
    );
  }

  /**
   * Recibe un arreglo de configuraciones y las inyecta en la clase Padre.
   */
  protected static setConfig(configs: IConfigInjection[]) {
    configs.forEach(({ key, valor }) => {
      (AbstractConfiguration as any)[key] = valor;
      this.logger.info(`💉 Configuración Inyectada a: ${key}`);
    });
  }

  /**
   * Inicializa las variables que el Toolkit necesita para arrancar (BD, Puertos default).
   * Escribe explícitamente en AbstractConfiguration para evitar Shadowing.
   */
  private static inicializaVariablesDefault() {
    AbstractConfiguration.APP_PUERTO = process.env.LOCAL
      ? `${process.env.APP_PUERTO}`
      : this.getString("PUERTO_DEFAULT");

    AbstractConfiguration.URL_BASE_HERRAMIENTAS =
      this.getString("URL_BASE_HTAS");
    AbstractConfiguration.BD_URL_DOCUMENT = this.getString("URL_DOC");

    this.validarYAsignarDB("CON_AURORA_DB", "PARAMS_DB_AURORA");
    this.validarYAsignarDB("CON_AURORA_DB_RO", "PARAMS_DB_AURORA_RO");
  }

  /**
   * Obtiene un valor crudo (string) del almacenamiento.
   * Lanza error si no existe.
   */
  protected static getString(alias: string): string {
    const val = this.storage.get(alias);
    if (val === undefined) {
      throw new Error(
        `Config Error: La variable '${alias}' no fue definida o no se pudo cargar.`
      );
    }
    return val;
  }

  /**
   * Obtiene y parsea un JSON almacenado bajo un alias.
   */
  protected static getJson<T>(alias: string): T {
    const val = this.getString(alias);
    try {
      return JSON.parse(val) as T;
    } catch (error) {
      const safeLog = val ? val.substring(0, 5) + "..." : "empty";
      throw new Error(
        `Config Error: La variable '${alias}' no es un JSON válido. Inicio: ${safeLog}`
      );
    }
  }

  /**
   * Busca variables por descripción dentro de un JSON Array (Legacy) y las asigna a la clase (this).
   * Útil para variables de negocio en la clase Hija.
   */
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
      }

      // Asignación Dinámica al contexto actual (Hijo)
      (this as any)[propName] = item.valor;
      this.logger.debug(`Variable asignada: ${propName}`);
    });
  }

  /**
   * Busca una variable por ID dentro de un JSON Array (Legacy).
   */
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

  /**
   * Busca una variable por descripción (Key) dentro de un JSON Array.
   * Retorna el valor string.
   */
  protected static getValueByName(
    aliasJson: string,
    descriptionKey: string
  ): string {
    const lista = this.getJson<any[]>(aliasJson);
    const item = lista.find((i) => i.descripcion === descriptionKey);

    if (!item)
      throw new Error(
        `Variable con descripción '${descriptionKey}' no encontrada en '${aliasJson}'`
      );

    return item.valor;
  }

  /**
   * Parsea un JSON y valida tipos (string/int) antes de asignarlo a 'this'.
   */
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
            `Config Error: '${ssmAlias}.${String(
              field
            )}' es obligatorio (string).`
          );
        }
      });
    }

    if (rules.requiredInts) {
      rules.requiredInts.forEach((field) => {
        const val = data[field];
        if (typeof val !== "number" || !Number.isInteger(val)) {
          throw new Error(
            `Config Error: '${ssmAlias}.${String(field)}' debe ser entero.`
          );
        }
      });
    }

    (this as any)[targetProperty] = data;
    this.logger.info(`✅ Variable '${targetProperty}' cargada y validada.`);
  }

  /**
   * Helper específico para Credenciales.
   */
  protected static validarCredenciales(
    alias: string,
    targetProperty: string
  ): void {
    try {
      const data = this.getJson<any[]>(
        alias
      ) as unknown as ICredencialesModel[];
      (this as any)[targetProperty] = data;
      this.logger.debug(`Credenciales cargadas en ${targetProperty}`);
    } catch (error) {
      throw new Error(
        `Error procesando credenciales '${alias}': Debe ser un JSON Array.`
      );
    }
  }

  /**
   * Helper Privado: Valida parámetros de DB y los asigna EXPLÍCITAMENTE al Padre.
   * Evita problemas de Shadowing y fugas de contraseñas en logs.
   */
  private static validarYAsignarDB(
    alias: string,
    targetProp: "PARAMS_DB_AURORA" | "PARAMS_DB_AURORA_RO"
  ) {
    // Usamos try/catch para ocultar el contenido del JSON en caso de error de parseo
    let data: IParametrosBD;
    try {
      data = this.getJson<IParametrosBD>(alias);
    } catch (e) {
      throw new Error(
        `Error crítico: El secreto de DB '${alias}' no es válido.`
      );
    }

    const requiredStrings = ["host", "usuario", "password"];
    const requiredInts = ["puerto"];

    requiredStrings.forEach((field) => {
      const val = (data as any)[field];
      if (typeof val !== "string" || val.trim() === "") {
        throw new Error(
          `Config DB Error: '${alias}.${field}' falta o está vacío.`
        );
      }
    });

    requiredInts.forEach((field) => {
      const val = (data as any)[field];
      if (typeof val !== "number" || !Number.isInteger(val)) {
        throw new Error(
          `Config DB Error: '${alias}.${field}' debe ser entero.`
        );
      }
    });

    // Asignación Explícita al Padre
    AbstractConfiguration[targetProp] = data;
    this.logger.info(
      `✅ ${targetProp} configurada correctamente (Infraestructura).`
    );
  }
}

export * from ".";
