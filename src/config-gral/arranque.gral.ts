import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import * as http from 'http';
import { AbstractConfiguration } from '../aws';
import { LoggerS3, PeticionTraza, RutaError, RutaPorDefecto, TraceId } from '../middlewares';
import { errorApi, exitoApi } from '../respuestas';
import { RutasMonitoreo } from '../rutas-monitoreo';

export class App {
    private static instance: express.Application;

    static getInstance(): express.Application {
        if (!App.instance) {
            App.instance = express();
        }

        return App.instance;
    }
}

export class AppRouter {
    private static instance: express.Router;

    static getInstance(): express.Router {
        if (!AppRouter.instance) {
            AppRouter.instance = express.Router();
        }

        return AppRouter.instance;
    }
}

class ConfiguracionExpress {
    private readonly logger = LoggerS3.getInstance().getLogger();
    private static instance: ConfiguracionExpress;

    private constructor() {
        this.logger.debug('Constructor privado de ConfiguracionExpress');
    }

    static getInstance(): ConfiguracionExpress {
        if (!this.instance) {
            this.instance = new ConfiguracionExpress();
        }
        return this.instance;
    }

    inicializar = (): express.Application => {
        const app = App.getInstance();
        app.use(cors());
        app.use(fileUpload());
        app.use(express.urlencoded({ extended: true }));
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header(
                'Access-Control-Allow-Headers',
                'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method',
            );
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
            res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
            next();
        });
        app.use(
            express.json({ limit: '25mb' }),
            (err: any, req: Request, res: Response, next: NextFunction) => {
                if (err) {
                    const mensajeError =
                        err.type === 'entity.too.large'
                            ? 'La entrada excede el peso permitido de 25mb'
                            : 'JSON mal formado';
                    const respuestaError =
                        errorApi.peticionNoValida.parametrosNoValidos(mensajeError);
                    return respuestaError.responder(res);
                }
                next();
            },
        );
        app.use(TraceId.generarTraceId);
        app.use(PeticionTraza.pintarTraza);
        return app;
    };
}

class ConfiguracionPuerto {
    private static instance: ConfiguracionPuerto;
    private logger = LoggerS3.getInstance().getLogger();
    private constructor() {}

    static getInstance(): ConfiguracionPuerto {
        if (!this.instance) {
            this.instance = new ConfiguracionPuerto();
        }
        return this.instance;
    }

    inicializar = async (): Promise<http.Server> => {
        const app = App.getInstance();
        const appPuertoConfig = (): Promise<http.Server> =>
            new Promise((resolve) => {
                const serv = app.listen(AbstractConfiguration.APP_PUERTO, () => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    AppRouter.getInstance().stack.forEach((ruta: any) => {
                        if (ruta && ruta.route && ruta.route.path) {
                            const verbo = Object.keys(ruta.route.methods)[0].toUpperCase();
                            this.logger.info(
                                `${AbstractConfiguration.APP_RUTA_BASE}${ruta.route.path} -->> ${verbo}`,
                            );
                        }
                    });
                    resolve(serv);
                });
            });
        try {
            const server = await appPuertoConfig();
            server.timeout = 0;
            server.setTimeout(0);
            this.logger.info(`Servidor ejecutandose en puerto: ${AbstractConfiguration.APP_PUERTO}`);
            return server;
        } catch (error: any) {
            this.logger.error(`'Error al configurar el puerto de la aplicación ${error.message}`);
            throw new Error('Error al configurar el puerto de la aplicación');
        }
    };
}

class ConfiguracionApagado {
    private logger = LoggerS3.getInstance().getLogger();
    private static instance: ConfiguracionApagado;

    static getInstance(): ConfiguracionApagado {
        if (!this.instance) {
            this.instance = new ConfiguracionApagado();
        }
        return this.instance;
    }

    inicializar = (server: http.Server): void => {
        process.on('uncaughtExceptionMonitor', (err: any, origin: any) => {
            this.logger.error(
                `Codigo recibido: uncaughtExceptionMonitor, error: ${err}, origen: ${origin}, Apagando servidor`,
            );
            this.apagarServicio('uncaughtExceptionMonitor', server);
        });
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error(
                `Codigo recibido: unhandledRejection, error: ${reason}, promise: ${promise}, Apagando servidor`,
            );
            this.apagarServicio('unhandledRejection', server);
        });
        process.on('SIGTERM', () => {
            this.logger.error(`Codigo recibido: SIGTERM, Apagando servidor`);
            this.apagarServicio('SIGTERM', server);
        });

        process.on('SIGINT', () => {
            this.logger.error(`Codigo recibido: SIGINT, Apagando servidor`);
            this.apagarServicio('SIGINT', server);
        });
    };

    apagarServicio = async (code: string, server: http.Server): Promise<void> => {
        //this.logger.info(`Codigo recibido: ${code} Apagando servidor`);
        server.close(async (error?: Error | undefined) => {
            if (error) {
                //this.logger.error('Ocurrió un error al cerrar el servidor', error);
            }
            //this.logger.info('Cerrando conexiones de BD ...');
            //this.logger.info('Conexiones cerradas!!');
            //this.logger.info('Servidor apagado!! Vuelva pronto! :)');
            process.exit();
        });
    };
}

class RutasBase {
    private static instance: RutasBase;
    static getInstance(): RutasBase {
        if (!this.instance) {
            this.instance = new RutasBase();
        }
        return this.instance;
    }
    monitoreo = async (solicitud: Request, respuesta: Response): Promise<Response> =>
        exitoApi.exito(respuesta, { mensaje: 'El servicio está vivo y disponible' });
}

/**
 * Inicializa las rutas base de monitoreo
 */
export const initRutasMonitoreo = () => {
    // 1. Inicializamos middlewares (BodyParser, Cors, etc.)
    ConfiguracionExpress.getInstance().inicializar();
    
    // 2. Obtenemos la instancia del router (pero NO hacemos app.use todavía)
    const router = AppRouter.getInstance();
    
    // 3. Definimos las rutas de monitoreo en ese router
    const monitoreo = RutasMonitoreo.getInstance();
    monitoreo.inicializar(router);
    monitoreo.monitoreoDisponible(RutasBase.getInstance().monitoreo);

    // ELIMINADO: app.use(AppRouter.getInstance());  <-- ESTO ERA EL ERROR
};

/**
 * Debe ir despues de: ConfiguracionRutas.getInstance().inicializar();
 */
export const iniciaRutasDefault = () => {
    // 1. Definimos rutas por defecto y de error en el router
    RutaPorDefecto.getInstance().inicializar(AppRouter.getInstance());
    RutaError.getInstance().inicializar(AppRouter.getInstance());

    // 2. AQUI montamos el Router una única vez bajo el prefijo configurado
    // Esto asegura que todo lo que se agregó al router (monitoreo + negocio)
    // pase por el flujo correcto.
    App.getInstance().use(AbstractConfiguration.APP_RUTA_BASE, AppRouter.getInstance());
};

/**
 * Debe ir final de toda la consiguracion.
 */
export const apagadoServidor = async () => {
    const server = await ConfiguracionPuerto.getInstance().inicializar();
    ConfiguracionApagado.getInstance().inicializar(server);
};

export * from '.';
