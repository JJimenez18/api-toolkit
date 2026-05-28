import NodeCache from "node-cache";
import crypto, { randomInt } from "crypto";
import { promisify } from "util";
import { ILLaveClienteRegistradas } from "./gestion.apps.cache";
import { Model } from "mongoose";
import { SistemasEnum } from "../enum";
import { LoggerS3 } from "../middlewares";
import { IDetalleServicio } from "../models";
import { calcularTiempoEjecucion } from "../utilerias";
import { cadenaCifradaAES } from "../cifrado";
import { errorApi } from "../respuestas";
const randomBytesAsync = promisify(crypto.randomBytes);

export interface IKeysSymmetric {
  symmetricKey: string;
  keyHash: string;
  idAcceso: number;
}

/**
 * keyPrivBack: deciframos response del back
 * keyPubClient: ciframos request
 */
export interface ILlaveGenerada extends IKeysSymmetric {
  keyPrivBack: string;
  keyPubClient: string;
}

/**
 * keyPrivClient: deciframos request
 * keyPubBack: ciframos response al cliente
 */
export interface ILLaveConsultada extends IKeysSymmetric {
  keyPrivClient: string;
  keyPubBack: string;
}

export interface ILLaveSeguridad extends ILLaveConsultada, ILlaveGenerada {
  userGenera: string;
  fecha: Date;
  fechaReutilizacion: Date;
  fechaFin: Date;
  estatus: number;
}

export interface ILlaves extends ILlaveGenerada, ILLaveConsultada {
  detalleEjecucion: IDetalleServicio[];
}

export interface ILlavesSimetricas extends IKeysSymmetric {
  tiempo: number;
}

export interface IGenerarLlaves {
  idAcceso: number;
  accesoPublico: string;
  accesoPrivado: string;
  accesoSimetrico: string;
  codigoAutentificacionHash: string;
}

export class GestionLlaves {
  private static instance: GestionLlaves;
  private readonly logger = LoggerS3.getInstance().getLogger();
  private constructor() { }
  static getInstance(): GestionLlaves {
    if (!this.instance) {
      this.instance = new GestionLlaves();
    }
    return this.instance;
  }

  private inyectarEnCache = (input: {
    cacheLlaves: NodeCache;
    cacheRelacionUsuario: NodeCache;
    llave: ILLaveSeguridad;
  }) => {
    const { cacheLlaves, cacheRelacionUsuario, llave } = input;
    const idStr = llave.idAcceso.toString();
    cacheLlaves.set(idStr, llave);
    cacheRelacionUsuario.set(llave.userGenera, idStr);
  };

  private limpiarLlave = (llave: string): string =>
    llave
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .trim();

  public cifraLlaveResponse = (
    llavesCliente: ILLaveClienteRegistradas,
    llave: ILlaveGenerada,
    cifrar = true
  ): IGenerarLlaves => {
    const AESKEYBASE64 = llavesCliente.llaveAes;
    const HMACKEYBASE64 = llavesCliente.llaveHash;
    return {
      idAcceso: Number(llave.idAcceso),
      accesoPublico: cifrar
        ? cadenaCifradaAES(AESKEYBASE64, HMACKEYBASE64, llave.keyPubClient)
        : llave.keyPubClient,
      accesoPrivado: cifrar
        ? cadenaCifradaAES(AESKEYBASE64, HMACKEYBASE64, llave.keyPrivBack)
        : llave.keyPrivBack,
      accesoSimetrico: cifrar
        ? cadenaCifradaAES(AESKEYBASE64, HMACKEYBASE64, llave.symmetricKey)
        : llave.symmetricKey,
      codigoAutentificacionHash: cifrar
        ? cadenaCifradaAES(AESKEYBASE64, HMACKEYBASE64, llave.keyHash)
        : llave.keyHash,
    };
  };

  public cifraLlaveIdResponse = (
    llavesCliente: ILLaveClienteRegistradas,
    llave: ILLaveConsultada,
    cifrar = true
  ): IGenerarLlaves => {
    const AESKEYBASE64 = llavesCliente.llaveAes;
    const HMACKEYBASE64 = llavesCliente.llaveHash;
    return {
      idAcceso: Number(llave.idAcceso),
      accesoPublico: cifrar
        ? cadenaCifradaAES(AESKEYBASE64, HMACKEYBASE64, llave.keyPubBack)
        : llave.keyPubBack,
      accesoPrivado: cifrar
        ? cadenaCifradaAES(AESKEYBASE64, HMACKEYBASE64, llave.keyPrivClient)
        : llave.keyPrivClient,
      accesoSimetrico: cifrar
        ? cadenaCifradaAES(AESKEYBASE64, HMACKEYBASE64, llave.symmetricKey)
        : llave.symmetricKey,
      codigoAutentificacionHash: cifrar
        ? cadenaCifradaAES(AESKEYBASE64, HMACKEYBASE64, llave.keyHash)
        : llave.keyHash,
    };
  };

  public createKeys = async (): Promise<Omit<ILlaves, "idAcceso">> => {
    const detalleEjecucion: IDetalleServicio[] = [];

    const incioEjecucion = performance.now();
    const [clientKeys, backKeys] = await Promise.all([
      this.generateKeyPairAsync(),
      this.generateKeyPairAsync(),
    ]);
    const finalEjecucion = performance.now();

    const {
      symmetricKey,
      keyHash,
      tiempo: tiempoCreateSymmetricKey,
    } = await this.createSymmetricKey();

    detalleEjecucion.push(
      {
        servicio: "createSymmetricKey",
        sistema: SistemasEnum[SistemasEnum.CRYPTO],
        tiempo: tiempoCreateSymmetricKey,
      },
      {
        servicio: "createKeys",
        sistema: SistemasEnum[SistemasEnum.CRYPTO],
        tiempo: calcularTiempoEjecucion({
          inicio: incioEjecucion,
          final: finalEjecucion,
        }),
      }
    );

    return {
      keyPubClient: this.limpiarLlave(clientKeys.publicKey),
      keyPrivBack: this.limpiarLlave(backKeys.privateKey),
      keyPrivClient: this.limpiarLlave(clientKeys.privateKey),
      keyPubBack: this.limpiarLlave(backKeys.publicKey),
      symmetricKey,
      keyHash,
      detalleEjecucion,
    };
  };

  private generateKeyPairAsync(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        "rsa",
        {
          modulusLength: 1024,
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        },
        (err, publicKey, privateKey) => {
          if (err) reject(err);
          else resolve({ publicKey, privateKey });
        }
      );
    });
  }

  private createSymmetricKey = async (): Promise<ILlavesSimetricas> => {
    const incioEjecucion = performance.now();
    const secretKey = await randomBytesAsync(32);
    const llaveSimetrica = secretKey.toString("base64");
    const hmac = crypto
      .createHmac("sha256", llaveSimetrica)
      .update("gda-apis", "base64")
      .digest("base64");

    const finalEjecucion = performance.now();
    return {
      symmetricKey: llaveSimetrica,
      keyHash: hmac,
      idAcceso: 0,
      tiempo: calcularTiempoEjecucion({
        inicio: incioEjecucion,
        final: finalEjecucion,
      }),
    };
  };

  private generarIdAccesoSeguro = (): number => {
    const ts = Date.now() % 10000000;
    const rnd = randomInt(0, 1000000);
    return ts * 1000000 + rnd;
  };

  /**
   * idAcceso
   * keyPubClient
   * keyPrivBack
   * symmetricKey
   * keyHash
   * 
   * Genera llave de seguridad y la inyecta en cache
   * Si no se envia gestionCache, no se inyecta en cache
   * - Si enviamos utilizaFechaReutilizacion = true, se creara 
   * fechaReutilizacion = new Date() + vigenciaLLave
   * fechaFinLLave = new Date() + vigenciaLLave * 2 + toleranciaMilisegundos
   * - Si enviamos utilizaFechaReutilizacion = false
   * fechaFinLLave = new Date() + vigenciaLLave
   * fechaReutilizacion = new Date()
   */
  public async generaLLaves<T>(input: {
    aplicacionCliente: string;
    vigenciaLLave: number;
    modelo: Model<T>;
    gestionCache?: {
      cacheLlaves: NodeCache;
      cacheRelacionUsuario: NodeCache;
    }
  },
    utilizaFechaReutilizacion = false
  ): Promise<ILlaveGenerada> {
    const { aplicacionCliente, vigenciaLLave, modelo } = input;
    const detalleEjecucion: IDetalleServicio[] = [];

    try {
      const fecha = new Date();
      // vigencia en milisegundos (vigenciaLlave)
      const vigenciaMilisegundos = Number(vigenciaLLave) * 60000;
      // tolerancia de 2 minutos adicionales para el cierre de peticiones
      const toleranciaMilisegundos = 2 * 60000;

      let fechaReutilizacion: Date;
      let fechaFinLLave: Date;

      // si es true, se creara fecha reutilizacion
      // si no fechaFin sera fechaActual + vigenciaLlave, sin tolerancia
      if (utilizaFechaReutilizacion) {
        // fechaReutilizacion: fechaActual + vigenciaLLave
        fechaReutilizacion = new Date(
          fecha.getTime() + vigenciaMilisegundos
        );
        // fechaFin: fechaActual + (vigenciaLLave * 2 + toleranciaMilisegundos)
        // Ejemplo: vigenciaLllave = 10 minutos
        // Se suman: 10 vigencia + 10 reutilizacion + 2 tolerancia
        const finLLaveMilisegundos =
          vigenciaMilisegundos + vigenciaMilisegundos + toleranciaMilisegundos;

        // fechaFinLLave: 22 minutos
        fechaFinLLave = new Date(fecha.getTime() + finLLaveMilisegundos);
      } else {
        fechaReutilizacion = new Date();
        fechaFinLLave = new Date(fecha.getTime() + vigenciaMilisegundos);
      }

      const {
        keyPrivBack,
        keyPubClient,
        keyPrivClient,
        keyPubBack,
        symmetricKey,
        keyHash,
        detalleEjecucion: detalleEjecucionLlaves,
      } = await this.createKeys();

      detalleEjecucion.push(...detalleEjecucionLlaves);

      let llaveGuardada = false;
      let idAccesoFinal = 0;
      let intentos = 0;
      const MAX_INTENTOS = 3;

      while (!llaveGuardada && intentos < MAX_INTENTOS) {
        try {
          idAccesoFinal = this.generarIdAccesoSeguro();

          const llave = {
            keyPrivBack,
            keyPubClient,
            keyPrivClient,
            keyPubBack,
            symmetricKey,
            keyHash,
            userGenera: aplicacionCliente,
            idAcceso: idAccesoFinal,
            fecha,
            fechaFin: fechaFinLLave,
            fechaReutilizacion,
            estatus: 1,
          };

          const inicio = performance.now();
          await modelo.create(llave);
          const fin = performance.now();

          detalleEjecucion.push({
            servicio: "create",
            sistema: SistemasEnum[SistemasEnum.DOCUMENT],
            tiempo: calcularTiempoEjecucion({ inicio, final: fin }),
          });

          if (input.gestionCache) {
            const { cacheLlaves, cacheRelacionUsuario } = input.gestionCache;
            this.inyectarEnCache({
              cacheLlaves,
              cacheRelacionUsuario,
              llave: llave,
            });
          }

          llaveGuardada = true;
        } catch (error: any) {
          if (error.code === 11000) {
            intentos++;
            this.logger.warn(
              `[Seguridad] Colisión en idAcceso: ${idAccesoFinal}. Intento ${intentos} de ${MAX_INTENTOS}`
            );
            if (intentos >= MAX_INTENTOS) {
              throw errorApi.errorInternoServidor.bd(
                "Error al guardar llave de seguridad"
              );
            }
          } else {
            throw errorApi.errorInternoServidor.bd(
              "Error al guardar llave de seguridad"
            );
          }
        }
      }

      this.logger.info(
        `Llave generada correctamente, idAcceso: ${idAccesoFinal}`,
        detalleEjecucion
      );

      return {
        symmetricKey,
        keyHash,
        idAcceso: idAccesoFinal,
        keyPrivBack,
        keyPubClient,
      };
    } catch (error: any) {
      this.logger.error(
        `ServiceLLaves ~ generaLLaves ~ error: ${JSON.stringify(error)}`
      );
      throw errorApi.errorInternoServidor.bd("Error al generar llave de seguridad");
    }
  }

  /**
   * Obtiene la ultima llave por usuario
   * 1. Busca en cache
   * 2. Si no existe, busca en BD
   * 3. Si encuentra en BD, inyecta en cache
   * @param input 
   * @returns 
   */
  public obtenerUltimaLlavePorUsuario_v2 = async (input: {
    cacheLlaves: NodeCache;
    cacheRelacionUsuario: NodeCache;
    userGenera: string;
    model: Model<any>;
  }): Promise<ILlaveGenerada | null> => {
    const { cacheLlaves, cacheRelacionUsuario, userGenera, model } = input;
    const ahora = new Date();
    const ultimoIdAcceso = cacheRelacionUsuario.get<string>(userGenera);

    let llaveGenerada: ILlaveGenerada | null = null;

    if (ultimoIdAcceso) {
      const llaveCache = cacheLlaves.get<ILLaveSeguridad>(ultimoIdAcceso);
      this.logger.info(
        `[Cache] Ultimo idAcceso: ${ultimoIdAcceso}, fechaFin: ${llaveCache?.fechaFin}`
      );
      if (llaveCache && new Date(llaveCache.fechaReutilizacion) > ahora) {
        this.logger.debug(
          `[Cache] Reutilizando llave para usuario: ${userGenera}`
        );
        llaveGenerada = llaveCache;
      } else {
        this.logger.info(
          `[Cache] ultimoIdAcceso superó su ventana de reutilización.`
        );
      }
    } else {
      this.logger.info("Buscando llave en BD para reutilizar");

      const llaveBD = await model
        .findOne({
          userGenera,
          fechaReutilizacion: { $gt: ahora },
        })
        .sort({ fecha: -1 })
        .lean();

      if (llaveBD) {
        this.logger.info(
          `[BD] Llave vigente para reutilizar. idAcceso: ${llaveBD.idAcceso}`
        );
        this.inyectarEnCache({
          cacheLlaves,
          cacheRelacionUsuario,
          llave: llaveBD,
        });
        llaveGenerada = llaveBD;
      }
    }

    if (!llaveGenerada) { return null }

    return {
      keyHash: llaveGenerada.keyHash,
      symmetricKey: llaveGenerada.symmetricKey,
      keyPubClient: llaveGenerada.keyPubClient,
      keyPrivBack: llaveGenerada.keyPrivBack,
      idAcceso: llaveGenerada.idAcceso,
    };
  };

  /**
   * Busca una llave por idAcceso
   * 1. Busca en cache
   * 2. Si no existe, busca en BD
   * 3. Si encuentra en BD, inyecta en cache
   * @param input 
   * @returns 
   */
  public obtenerLlavePorIdAcceso_v2 = async (input: {
    cacheLlaves: NodeCache;
    cacheRelacionUsuario: NodeCache;
    idAcceso: string;
    model: Model<any>;
  }): Promise<ILLaveConsultada | null> => {
    const { cacheLlaves, cacheRelacionUsuario, idAcceso, model } = input;
    const ahora = new Date();
    const llaveCache = cacheLlaves.get<ILLaveSeguridad>(idAcceso);
    let llaveVigente: ILLaveSeguridad | null = null;

    if (llaveCache) {
      if (new Date(llaveCache.fechaFin) > ahora) {
        this.logger.debug(
          `[Cache] Llave encontrada y válida por ID: ${idAcceso}`
        );
        llaveVigente = llaveCache;
      } else {
        this.logger.debug(
          `[Cache] Llave expiró. Eliminando: ${idAcceso}`
        );
        cacheLlaves.del(idAcceso);
      }
    } else {
      this.logger.info(`Buscando idAcceso: ${idAcceso} en la BD`);

      const llaveBD = await model
        .findOne({
          idAcceso: Number(idAcceso),
          fechaFin: { $gt: ahora },
        })
        .lean();

      if (llaveBD) {
        this.logger.info(
          `llaveVigente en la BD podemos reutilizar el idAcceso: ${llaveBD.idAcceso}`
        );
        this.inyectarEnCache({
          cacheLlaves,
          cacheRelacionUsuario,
          llave: llaveBD,
        });
        llaveVigente = llaveBD as ILLaveSeguridad;
      }

      if (!llaveVigente) {
        this.logger.info(
          `[Seguridad] Acceso denegado: ${idAcceso}. La llave no existe o superó su tolerancia máxima.`
        );
      } else {
        this.logger.info("[Seguridad] Acceso Concedido");
        this.logger.info(`Hora Actual: ${ahora.toLocaleTimeString()}`);
        this.logger.info(`Fin de vigencia: ${llaveVigente.fechaFin.toLocaleTimeString()}`);
      }
    }

    if (!llaveVigente) return null;

    return {
      keyHash: llaveVigente.keyHash,
      symmetricKey: llaveVigente.symmetricKey,
      keyPrivClient: llaveVigente.keyPrivClient,
      keyPubBack: llaveVigente.keyPubBack,
      idAcceso: llaveVigente.idAcceso,
    };
  };

  /**
   * Obtiene la fecha minima aceptable para reutilizar una llave
   * Se obtienes la fecha sumando 30 segundos a la fecha actual
   * @returns Date
   */
  private obtenerMinimoTiempoAceptable = (): Date => {
    const fechaMinimaAceptable = new Date(Date.now() + 30 * 1000);
    this.logger.info(
      `Fecha minima aceptable: ${fechaMinimaAceptable.toLocaleTimeString()}`
    );
    return fechaMinimaAceptable;
  };

  private obtenerFechaToleranciaAceptable = ({
    vigencia,
    idAcceso,
  }: {
    vigencia: number;
    idAcceso: string;
  }) => {
    const ahora = new Date();
    const MARGEN_MINUTOS = Number(vigencia) + 2;
    const fechaConTolerancia = new Date(
      ahora.getTime() - MARGEN_MINUTOS * 60000
    );

    this.logger.info(`[Seguridad] Vigencia de llave: ${vigencia} min.`);
    this.logger.info(`[Seguridad] Validando acceso: ${idAcceso}`);
    this.logger.info(`[Seguridad] Margen: ${MARGEN_MINUTOS} min.`);

    return { fechaConTolerancia, ahora, MARGEN_MINUTOS };
  };

  public obtenerUltimaLlavePorUsuario = async (input: {
    cacheLlaves: NodeCache;
    cacheRelacionUsuario: NodeCache;
    userGenera: string;
    // fechaMinimaAceptable: Date,
    model: Model<any>;
  }): Promise<ILlaveGenerada | null> => {
    const { cacheLlaves, cacheRelacionUsuario, userGenera, model } = input;
    const fechaMinimaAceptable = this.obtenerMinimoTiempoAceptable();
    const ultimoIdAcceso = cacheRelacionUsuario.get<string>(userGenera);

    let llaveGenerada: ILlaveGenerada | null = null;

    if (ultimoIdAcceso) {
      const llaveCache = cacheLlaves.get<ILLaveSeguridad>(ultimoIdAcceso);

      if (llaveCache && new Date(llaveCache.fechaFin) > fechaMinimaAceptable) {
        this.logger.debug(
          `[Cache] Reutilizando llave para usuario: ${userGenera}, fechaFin: ${llaveCache.fechaFin.toLocaleTimeString()}`
        );
        // return llaveCache;
        llaveGenerada = llaveCache;
      } else {
        this.logger.info(
          `ultimoIdAcceso ya vencio: ${llaveCache?.fechaFin.toLocaleTimeString()}`
        );
      }
    } else {
      this.logger.info("Buscando llave en BD para reutilizar");

      const llaveBD = await model
        .findOne({
          userGenera,
          fechaFin: { $gt: fechaMinimaAceptable },
        })
        .sort({ fecha: -1 })
        .lean();

      if (llaveBD) {
        this.logger.info(
          `llaveVigente en la BD podemos reutilizar el idAcceso: ${llaveBD.idAcceso
          }, fechaFin: ${llaveBD.fechaFin.toLocaleTimeString()}`
        );
        this.inyectarEnCache({
          cacheLlaves,
          cacheRelacionUsuario,
          llave: llaveBD,
        });
        llaveGenerada = llaveBD;
      }
    }

    if (!llaveGenerada) {
      return null;
    }

    return {
      keyHash: llaveGenerada.keyHash,
      symmetricKey: llaveGenerada.symmetricKey,
      keyPubClient: llaveGenerada.keyPubClient,
      keyPrivBack: llaveGenerada.keyPrivBack,
      idAcceso: llaveGenerada.idAcceso,
    };
  };

  public obtenerLlavePorIdAcceso = async (input: {
    cacheLlaves: NodeCache;
    cacheRelacionUsuario: NodeCache;
    idAcceso: string;
    model: Model<any>;
    vigencia: number;
  }): Promise<ILLaveConsultada | null> => {
    const { cacheLlaves, cacheRelacionUsuario, idAcceso, model, vigencia } =
      input;
    const { fechaConTolerancia, ahora, MARGEN_MINUTOS } =
      this.obtenerFechaToleranciaAceptable({ vigencia, idAcceso });
    const llaveCache = cacheLlaves.get<ILLaveSeguridad>(idAcceso);
    let llaveVigente: ILLaveSeguridad | null = null;

    if (llaveCache) {
      if (new Date(llaveCache.fechaFin) > fechaConTolerancia) {
        this.logger.debug(
          `[Cache] Llave encontrada y válida por ID: ${idAcceso}`
        );
        // return llaveCache;
        llaveVigente = llaveCache;
      } else {
        this.logger.debug(
          `[Cache] Eliminando llave expirada del caché: ${idAcceso}`
        );
        cacheLlaves.del(idAcceso);
      }
    } else {
      this.logger.info(`Buscando idAcceso: ${idAcceso} en la BD`);

      const llaveBD = await model
        .findOne({
          idAcceso: Number(idAcceso),
          fechaFin: { $gt: fechaConTolerancia },
        })
        .lean();

      if (llaveBD) {
        this.inyectarEnCache({
          cacheLlaves,
          cacheRelacionUsuario,
          llave: llaveBD,
        });
        // return llaveBD as ILLaveSeguridad;
        llaveVigente = llaveBD as ILLaveSeguridad;
      }

      if (!llaveVigente) {
        this.logger.info(
          `[Seguridad] Acceso denegado: ${idAcceso}. La llave no existe o fechaFin tiene más de ${MARGEN_MINUTOS} min.`
        );
      } else {
        const horaVencimiento = llaveVigente.fechaFin;
        const horaLimiteDisponibilidad = new Date(
          horaVencimiento.getTime() + MARGEN_MINUTOS * 60000
        );
        const esGracia = ahora > horaVencimiento;

        this.logger.info("[Seguridad] Detalle de Vigencia");
        this.logger.info(`Hora Actual: ${ahora.toLocaleTimeString()}`);
        this.logger.info(
          `Registro: ${llaveVigente.fecha.toLocaleTimeString()}`
        );
        this.logger.info(`Vence: ${horaVencimiento.toLocaleTimeString()}`);
        this.logger.info(
          `Disponible hasta: ${horaLimiteDisponibilidad.toLocaleTimeString()}`
        );
        this.logger.info(`Resultado: ${esGracia ? "ADMITIDO" : "VIGENTE"}`);
      }
    }

    if (!llaveVigente) {
      return null;
    }

    return {
      keyHash: llaveVigente.keyHash,
      symmetricKey: llaveVigente.symmetricKey,
      keyPrivClient: llaveVigente.keyPrivClient,
      keyPubBack: llaveVigente.keyPubBack,
      idAcceso: llaveVigente.idAcceso,
    };
  };
}
