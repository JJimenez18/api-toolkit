import { NextFunction, Request, RequestHandler, Response } from "express";
import axios, { AxiosRequestConfig } from "axios";
import { AbstractConfiguration } from "../aws";
import { LoggerS3 } from "../middlewares";
import { errorApi } from "../respuestas";
import { EMensajesError } from "../enum";
import { operacionesEncryptRSA, EOpEncrypt } from "../utilerias";

export interface ILLaveClienteSeguridad {
  keyPrivBack: string;
  keyPrivClient: string;
  keyPubClient: string;
  keyPubBack: string;
  symmetricKey: string;
  keyHash: string;
  idAcceso: number;
  fecha: Date;
  fechaFin: Date;
  estatus: number;
  userGenera: string;
  fechaReutilizacion: Date;
}

export class GestorLlavesSeguridad {
  private static instance: GestorLlavesSeguridad;
  private logger = LoggerS3.getInstance().getLogger();
  private readonly keyPubBack =
    "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDVTgHYolwE/HgFYrVvQJSoOkRFIGlwfEZIBoH4mAMcaClRJRG1IB0batJVUKJXN5485iU3uKq9pzZ4xLRaUvNtjKnqyJsb0Nl2k2ICgJ5n8Jm+bBaMi2mbqMqbo1mUwa+wtaEgyW2BNjK4Y8sNu1p+zB6XG9OO2JYnVnDb+sXaSwIDAQAB";
  private readonly keyPrivClient =
    "MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBAOqzA0rssRlRoihPZtU6vh3eNstMwHJglllGVE+G2NsxwHFd1W9cINBqHEymaTWXrjfa+o0brfKXmV2EoYXzt/oG2ZLE7fGpyw0b5nxSROc7Sy6Cor/Xg+W8EnEsXWV+jlGLCkql3j0E8gQ05hNTV4uK2ei2K7Y958wKBP8Azr01AgMBAAECgYA7J19fFQUWApNCYbDjcWjVklpxJykiKuH6IlXBrZUeug1tBV90L949aWE0mITP8yj//vtDcYSILlmDTph/cIwfxs/d1KPp7ibHNS8X6LHpXUY2+jMA2ywa6YOEEvpaJS/FsYPdrS2LJPCwzSNBn9SkmAwyFM+L04mIU+dryFXdAQJBAP6OVasLUJOp8o4+f34QmA/4Z3gQUgxWFMpSiI91mHAoOE9m/teyL8o7hYyFxWlMwolflA1BYd3GWQKkw1yQkVUCQQDsB9ekSd6k+yyIKkeoYMnN0D9VDo2vs4CzSPtD4H/Z5F1X4evqw08+jxordZ49gvO1TqeXQMzHsyp5ijUDGPxhAkEAjTBpN8u4z45NqLPlhwixLvp6eU+kEo+UTHvmnpt9B4hnYzMfWofMlgDZnA1+Z19Z71QCDDAdliKzsBGvAiJ1WQJBALEH9MrJiQ/PQIhkxdhZuCMBde8S+lx1Uyulqqgvg1VnfkeDMRKlKROv+53rGyPhy28KrpK4zJ9gF5SPf9Fx9SECQB8YMRI/H8uwlGTS5GTOmAPRYHiemfh2xeV3Zq1KFJv0xLz++UufYqg5psLH217+Is+pb4CraepRKOoiRhZ3afQ=";
  private readonly keyPubClient =
    "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDqswNK7LEZUaIoT2bVOr4d3jbLTMByYJZZRlRPhtjbMcBxXdVvXCDQahxMpmk1l6432vqNG63yl5ldhKGF87f6BtmSxO3xqcsNG+Z8UkTnO0sugqK/14PlvBJxLF1lfo5RiwpKpd49BPIENOYTU1eLitnotiu2PefMCgT/AM69NQIDAQAB";
  private readonly symmetricKey =
    "cftRMbeJOlaQifI0hyMbFkB6DjCcX74g9hZZfxtOrWg=";
  private readonly keyHash = "DUsamKC2nUMCLaO6+BixK+kh3SK+RQ/WQpYjFoiwjzY=";
  private constructor() {
    this.logger.debug("Gestor llave Seguridad Inicializado");
  }

  static getInstance(): GestorLlavesSeguridad {
    if (!GestorLlavesSeguridad.instance) {
      GestorLlavesSeguridad.instance = new GestorLlavesSeguridad();
    }
    return GestorLlavesSeguridad.instance;
  }

  private consultaLLavesCifrado = async (info: {
    idAcceso: number;
    apiName?: string;
  }): Promise<ILLaveClienteSeguridad> => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const { idAcceso, apiName } = info;
    let llaves;
    const mensaje = `El x-id-acceso: ${idAcceso} esta vencido o no se encontró`;
    if (!AbstractConfiguration.URL_BASE_HERRAMIENTAS) {
      LoggerS3.getInstance()
        .getLogger()
        .info("process.env.URL_BASE_HERRAMIENTAS no tiene informacion");
    }
    try {
      const config: AxiosRequestConfig = {
        method: "get",
        url: `${AbstractConfiguration.URL_BASE_HERRAMIENTAS}/InterfacesRH/backoffice/seguridad/v2/keys/user/${idAcceso}`,
      };
      LoggerS3.getInstance()
        .getLogger()
        .info(`consultaLLavesCifrado ~ config: ${JSON.stringify(config)}`);
      const resp = (await axios.request(config)).data;
      if (resp && resp.resultado) {
        llaves = resp.resultado;
        // console.log('🚀 ~ consultaLLavesCifrado ~ llaves:', llaves);
        return llaves;
      }
      LoggerS3.getInstance()
        .getLogger()
        .info("consultaLLavesCifrado ~ resp.resultado no tiene informacion");
      // llaves = await LLaveClienteSeguridadModel.findOne({
      //   idAcceso,
      //   fechaFin: { $gt: new Date() },
      // });
      throw errorApi.recursoNoEncontrado.recursoBDNoEncontrado(mensaje);
    } catch (error: any) {
      LoggerS3.getInstance()
        .getLogger()
        .info(
          `consultaLLavesCifrado error: ${JSON.stringify(error.response?.data)}`
        );
      if ([404].includes(error.response?.status)) {
        throw errorApi.recursoNoEncontrado.recursoBDNoEncontrado(mensaje);
      }
      throw errorApi.errorInternoServidor.bd(
        error.response?.data?.detalles || EMensajesError.KEY_ERROR,
        5009,
        apiName || AbstractConfiguration.API_NOMBRE
      );
    }
    /* if (!llaves) {
      logger.info(mensaje);
      throw errorApi.peticionNoAutorizada.peticionNoAutorizada(mensaje, 4106, apiName);
    } */
  };

  public validaLLavesCifrado = async (info: {
    aplicacion: string;
    idAcceso: number;
    keymock: number;
    apiName?: string;
  }): Promise<{
    keyPubBack: string;
    symmetricKey: string;
    keyHash: string;
    keyPrivClient: string;
    keyPubClient: string;
  }> => {
    const { keymock, idAcceso, apiName } = info;
    let keyPrivClient = this.keyPrivClient;
    let keyPubBack = this.keyPubBack;
    let symmetricKey = this.symmetricKey;
    let keyPubClient = this.keyPubClient;
    let keyHash = this.keyHash;
    if (![1].includes(keymock)) {
      const respSeg = await this.consultaLLavesCifrado({
        idAcceso,
        apiName,
      });
      keyPrivClient = respSeg.keyPrivClient;
      keyPubBack = respSeg.keyPubBack;
      symmetricKey = respSeg.symmetricKey;
      keyHash = respSeg.keyHash;
    }
    return {
      keyPrivClient,
      keyPubBack,
      symmetricKey,
      keyPubClient,
      keyHash,
    };
  };

  /**
   * Middleware: Obtención de Llaves de Seguridad.
   *
   * @description Extrae credenciales de headers y valida el set de llaves de cifrado.
   * @returns INYECTA en req.body:
   *  - accesoPublico: Llave pública del Backend.
   *  - accesoPrivado: Llave privada del Cliente.
   *  - simetrico: Llave AES.
   *  - hash: Secreto para validación de integridad de datos.
   *  - accesoPublicoCliente: Llave pública del Cliente (para cifrar la petición).
   */
  public obtenerKeys = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const aplicacion = req.headers["x-aplicacion"]
      ? req.headers["x-aplicacion"]?.toString()
      : "";
    const idAcceso = req.headers["x-id-acceso"]
      ? Number(req.headers["x-id-acceso"])
      : 0;
    const keymock = req.headers?.keymock ? Number(req.headers.keymock) : 0;
    const { keyPrivClient, keyPubBack, symmetricKey, keyHash, keyPubClient } =
      await this.validaLLavesCifrado({
        aplicacion,
        idAcceso,
        keymock,
      });
    req.body.accesoPublico = keyPubBack;
    req.body.accesoPrivado = keyPrivClient;
    req.body.simetrico = symmetricKey;
    req.body.hash = keyHash;
    req.body.accesoPublicoCliente = keyPubClient;
    next();
  };

   /**
   * Middleware: Obtención de Llaves de Seguridad.
   *
   * @description Extrae credenciales de headers y valida el set de llaves de cifrado.
   * Parametro opcional apiName, para inyectar API_NOMBRE especificos
   * @returns INYECTA en req.body:
   *  - accesoPublico: Llave pública del Backend.
   *  - accesoPrivado: Llave privada del Cliente.
   *  - simetrico: Llave AES.
   *  - hash: Secreto para validación de integridad de datos.
   *  - accesoPublicoCliente: Llave pública del Cliente (para cifrar la petición).
   */

  public getKeysUser = (
    apiName = AbstractConfiguration.API_NOMBRE
  ): RequestHandler => {
    const middleware: RequestHandler = async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const aplicacion = req.headers["x-aplicacion"]
        ? req.headers["x-aplicacion"]?.toString()
        : "";
      const idAcceso = req.headers["x-id-acceso"]
        ? Number(req.headers["x-id-acceso"])
        : 0;
      const keymock = req.headers?.keymock ? Number(req.headers.keymock) : 0;
      const { keyPrivClient, keyPubBack, symmetricKey, keyHash, keyPubClient } =
        await this.validaLLavesCifrado({
          aplicacion,
          idAcceso,
          keymock,
          apiName,
        });
      req.body.accesoPublico = keyPubBack;
      req.body.accesoPrivado = keyPrivClient;
      req.body.simetrico = symmetricKey;
      req.body.hash = keyHash;
      req.body.accesoPublicoCliente = keyPubClient;
      next();
    };
    return middleware;
  };

  /**
   * Configura las llaves de seguridad en la petición.
   * @param apiNombre Identificador de la API para el gestor de llaves.
   * @returns Inyecta en req.body:
   *          - accesoPublico: Llave pública del backend (RSA)
   *          - accesoPrivado: Llave privada asociada al cliente
   *          - simetrico: Llave AES para cifrado de mensajes
   *          - hash: Llave para validación de integridad
   *          - accesoPublicoCliente: Llave pública del cliente que ocuparemos para cifrar el request
   */
  public set = (apiNombre?: string) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const aplicacion = req.headers["x-aplicacion"]?.toString() || "";
      const idAcceso = Number(req.headers["x-id-acceso"]) || 0;
      const keymock = Number(req.headers.keymock) || 0;
      try {
        const {
          keyPrivClient,
          keyPubBack,
          symmetricKey,
          keyHash,
          keyPubClient,
        } = await GestorLlavesSeguridad.getInstance().validaLLavesCifrado({
          aplicacion,
          idAcceso,
          keymock,
          apiName: apiNombre || undefined,
        });
        req.body.accesoPublico = keyPubBack;
        req.body.accesoPrivado = keyPrivClient;
        req.body.simetrico = symmetricKey;
        req.body.hash = keyHash;
        req.body.accesoPublicoCliente = keyPubClient;
        return next();
      } catch (error: any) {
        if (req.url.startsWith("/services")) {
          throw errorApi.recursoNoEncontrado.desconocido(error.detalles);
        }
        throw errorApi.peticionNoAutorizada.desconocido(
          EMensajesError.NOT_AUTH,
          undefined,
          apiNombre
        );
      }
    };
  };

  /**
   * Middleware genérico para cifrar campos del body utilizando RSA.
   * @param campos Lista de strings con los nombres de las propiedades a cifrar.
   * Los campos pueden ser definidos:
   * Una propiedad simple: "campo"
   * Propiedades anidadas: "objeto.subobjeto.campo"
   * Arreglos usando "[]": "detalle[].precio" recorrerá cada elemento del arreglo detalle
   * @param oaep Booleano para activar/desactivar el padding OAEP (por defecto false).
   */
  public cifraReqRSA = (campos: string[], oaep: boolean = false) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // 1. Verificación del header 'cifrarequest'. Si es '0', se salta el cifrado.
      const cifrarequest = req.headers["cifrarequest"]?.toString() || "0";
      if (cifrarequest === "0") {
        return next();
      }

      try {
        /**
         * 2. Ejecución del cifrado RSA.
         * Se utiliza la llave pública del cliente inyectada previamente en el body.
         * @returns El body con los campos especificados convertidos a criptogramas.
         */
        req.body = operacionesEncryptRSA(
          req.body,
          campos,
          (req.body as any).accesoPublicoCliente,
          oaep,
          EOpEncrypt.CIFRADO
        );

        // Comentario: Si necesitas cifrar archivos adjuntos con AES (GCM),
        // este es el punto de inyección lógica usando req.body.simetrico.
      } catch (error: any) {
        // 3. Manejo de excepciones en el proceso de cifrado.
        LoggerS3.getInstance().getLogger().error(`Error al cifrar los campos RSA: ${error.message}`);
        // Opcional: throw errorApi... si quieres que el cliente sepa que falló el cifrado.
      }

      return next();
    };
  };

  /**
   * Middleware genérico para descifrar campos del body utilizando RSA.
   * @param campos Lista de propiedades que vienen cifradas y se deben procesar.
   * Los campos pueden ser definidos:
   * Una propiedad simple: "campo"
   * Propiedades anidadas: "objeto.subobjeto.campo"
   * Arreglos usando "[]": "detalle[].precio" recorrerá cada elemento del arreglo detalle
   * @param oaep Booleano para el padding RSA (por defecto false).
   */
  public descifrarDatosRSA = (campos: string[], oaep: boolean = false) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        /**
         * 1. Descifrado RSA de campos específicos.
         * Se utiliza 'accesoPrivado' (inyectada previamente por el Gestor de Llaves).
         */
        req.body = operacionesEncryptRSA(
          req.body,
          campos,
          (req.body as any).accesoPrivado,
          oaep,
          EOpEncrypt.DECIFRADO
        );

        return next();
      } catch (error: any) {
        this.logger.info(`Error en descifrarDatosRSA: ${error.message || error}`);

        throw errorApi.peticionInvalida.parametrosNoValidos(
          "No se pudo descifrar la información"
        );
      }
    };
  };
}

export * from ".";
