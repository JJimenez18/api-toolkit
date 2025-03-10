import TelegramBot from 'node-telegram-bot-api';
import {LoggerS3, TraceId} from '../middlewares/logger.s3';

const tokenDefault = '5137845409:AAFlhqU7RzV02OnTu1Yj-n3XhL18Q6ZBfkQ';
const idGrupoDefault = process.env.ID_TELEGRAM || '-969215861';

export class Telegram {
    private static instances: Map<string, Telegram> = new Map();
    private readonly modulo = process.env.API_NOMBRE || '';
    private readonly bot: TelegramBot;
    // private readonly tokenTelegram: string;

    constructor(token: string) {
        // this.tokenTelegram = token;
        this.bot = new TelegramBot(token);
    }

    static getInstance(token?: string): Telegram {
        const tokenD = token || tokenDefault;
        if (!this.instances.has(tokenD)) {
            this.instances.set(tokenD, new Telegram(tokenD));
        }
        return this.instances.get(tokenD)!;
    }

    public enviarNotificacion = async (
        mensaje: string | {subtitulo: string; parrafo: string}[],
        id?: string
    ): Promise<void> => {
        try {
            const mensajeFormateado = Array.isArray(mensaje)
                ? mensaje.map((m) => `- *${m.subtitulo}* : _${m.parrafo}_`).join('\n\n')
                : mensaje;
            const encabezadoFormateado = `*${`${this.modulo}`.toUpperCase()}*\n`;
            const mensajeTelegram = encabezadoFormateado
            .concat('\n')
            .concat(mensajeFormateado.toString())
            .concat('\n\n')
            .concat(`*TraceId* : _ ${TraceId.obtenerTraceId()}_`.trim());

            await this.sendMessageAsync(id || idGrupoDefault, mensajeTelegram, {
                parse_mode: 'Markdown',
            });
        } catch (error: any) {
            LoggerS3.getInstance().getLogger().info(`Error al enviar notificación ${error?.message}`);
        }
    };

    public enviarArchivo = async (
        parametros: {mensaje: string; archivo: {base64: string; nombre: string}},
        id?: string
    ): Promise<{hayError: boolean}> => {
        const {archivo, mensaje} = parametros;
        try {
            await this.bot.sendMessage(id || idGrupoDefault, mensaje, {
                parse_mode: 'Markdown',
            });
            await this.bot.sendDocument(
                id || idGrupoDefault,
                Buffer.from(archivo.base64 || '', 'base64'),
                {},
                {contentType: 'base64', filename: archivo.nombre}
            );
            return {hayError: false};
        } catch (error: any) {
            console.error('Error al enviar archivo', error.message);
            return {hayError: true};
        }
    };

    public enviarMensajeAUsuario = async (userId: string, mensaje: string, token?: string): Promise<void> => {
        try {
            // Si no se proporciona un token, usa el primero disponible
            const botInstance = token ? Telegram.getInstance(token) : Array.from(Telegram.instances.values())[0];

            if (!botInstance) {
                throw new Error('No hay instancias de bots disponibles.');
            }

            await botInstance.sendMessageAsync(userId, mensaje, {parse_mode: 'Markdown'});
            console.log(`Mensaje enviado a ${userId}`);
        } catch (error: any) {
            console.error(`Error al enviar mensaje a ${userId}:`, error.message);
        }
    };

    private sendMessageAsync(chatId: string, message: string, options: object): Promise<any> {
        return this.bot.sendMessage(chatId, message, options);
    }
}

export let catTokensBots = [tokenDefault];

if (process.env.CAT_BOTS) {
    try {
        const parsedBots = JSON.parse(process.env.CAT_BOTS);
        if (Array.isArray(parsedBots)) {
            catTokensBots = catTokensBots.concat(parsedBots);
        } else {
            console.warn('⚠️ CAT_BOTS no es un array válido.');
        }
    } catch (error) {
        console.error('❌ Error al parsear CAT_BOTS:', error);
    }
}
// Inicializa bots con diferentes tokens
catTokensBots.forEach((token) => Telegram.getInstance(token));

// Envia notificacion a un grupo donde vive el bot, se envia por default al grupo de htas dev
// Telegram.getInstance().enviarNotificacion('Prueba mensaje')
// envia mensaje a un usuario en especico desde el bot, nos ayuda a enviar mensaje desde un bot en especifico
// Telegram.getInstance().enviarMensajeAUsuario('2028260298', 'Prueba mensaje', catTokensBots[1])
// Telegram.getInstance().enviarMensajeAUsuario('2028260298', 'Prueba mensaje bot test', catTokensBots[2])