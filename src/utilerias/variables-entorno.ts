import stringify from 'fast-safe-stringify';

export enum LoggerLevelsEnum {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
}
export interface IConfiguracionLog {
  bucket: string;
  folder?: string;
  nameFormat?: string;
  rotateEvery?: string;
  maxFileSize?: string;
  uploadEvery?: string;
  bufferSize?: string;
}
export class VariablesEntorno {
  private static instance: VariablesEntorno;
  static readonly API_NOMBRE = process.env.API_NOMBRE || '';
  static readonly LOGGER_LEVEL = process.env.LOGGER_LEVEL || '';
  static readonly AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
  static readonly AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
  static readonly LOGGER_COLOR = ((): boolean => {
    const varColor = process.env.LOGGER_COLOR || '';
    if (varColor === 'true') {
      return true;
    }
    if (varColor === 'false' || varColor === '') {
      return false;
    }
    throw new Error('LOGGER_COLOR debe ser true o false. Esta variable es opcional y su valor por default es false.');
  })();
  static readonly CONFIGURACION_LOG = (():IConfiguracionLog => {
    let configuracion: IConfiguracionLog = { bucket: '' };
    if (!process.env.CONFIGURACION_LOG || `${process.env.CONFIGURACION_LOG}`.trim() === '') {
      return configuracion;
    }
    try {
      configuracion = JSON.parse(`${process.env.CONFIGURACION_LOG}`.replace(/[']+/g, '"'));
    } catch (error) {
      console.error('La variable configuracionLog debe ser un JSON');
    }
    return configuracion;
  })();

  // eslint-disable-next-line no-useless-constructor, @typescript-eslint/no-empty-function
  private constructor() { }

  static getInstance(): VariablesEntorno {
    if (!this.instance) {
      this.instance = new VariablesEntorno();
    }
    return this.instance;
  }

  private validarNivelLogger = (): void => {
    if (VariablesEntorno.LOGGER_LEVEL === '') {
      throw new Error('Falta la variable LOGGER_LEVEL');
    }
    let validLevel = false;
    const levels = Object.values(LoggerLevelsEnum);
    for (let i = 0; i < levels.length; i += 1) {
      if (levels[i] === VariablesEntorno.LOGGER_LEVEL) {
        validLevel = true;
        break;
      }
    }
    if (!validLevel) {
      throw new Error(`La variable LOGGER_LEVEL debe tener uno de los siguiente valores: ${stringify(levels)}`);
    }
  }

  inicializar = (): void => {
    if (VariablesEntorno.API_NOMBRE === '') {
      throw new Error('Falta variable API_NOMBRE');
    }
    this.validarNivelLogger();
  }
}
