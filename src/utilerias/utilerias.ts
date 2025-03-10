import { performance } from 'perf_hooks';
export class Utilerias {
  static generarFolio = (): string => {
    const fecha = new Date();
    const numeroMes = fecha.getMonth() + 1;
    const mes = numeroMes < 10 ? `0${numeroMes}` : numeroMes;
    const dia = fecha.getDate() < 10 ? `0${fecha.getDate()}` : fecha.getDate();
    const hora = fecha.getHours() < 10 ? `0${fecha.getHours()}` : fecha.getHours();
    const minuto = fecha.getMinutes() < 10 ? `0${fecha.getMinutes()}` : fecha.getMinutes();
    const segundo = fecha.getSeconds() < 10 ? `0${fecha.getSeconds()}` : fecha.getSeconds();
    // eslint-disable-next-line max-len
    return `${fecha.getFullYear()}${mes}${dia}${hora}${minuto}${segundo}${fecha.getMilliseconds()}`;
  }

  /**
   * Función que concatena una lista de cadenas.
   * @param cadenas Lista de cadenas a unir.
   * @returns Devuelve una cadena producto de la concatenación.
   */
  static unaLinea = (...cadenas: string[]): string => cadenas
    .reduce((anterior, siguiente) => `${anterior || ''}${siguiente}`);

  /**
  * Función que agrega ceros a la izquierda.
  * @param cadena Cadena que se modificará.
  * @param longitud Número que indica la longitud final que tendrá la cadena.
  * @returns Devuelve la cadena con los ceros correspondientes.
  * Si la cadena original es mayor que el parámetro longitud, se devuelve la cadena original.
  * Ejemplo: cadena --> 1234, longitud --> 6, resultado: 001234
  */
  static agregarCerosIzq = (cadena: string, longitud: number): string => {
    const cad = `${cadena}`;
    if (!cad || cad.trim() === '') return cad;
    const cerosFaltantes = longitud - cad.length;
    if (cerosFaltantes <= 0) return cad;
    /* let ceros = '';
    for (let i = 0; i < cerosFaltantes; i += 1) {
      ceros += '0';
    } */
    const cero = '0';
    return `${cero.repeat(cerosFaltantes)}${cad}`;
  };

  /**
  * Función que elimina los ceros a la izquierda (o cualquier caracter que no sea un número del 1 al 9) de una cadena.
  * @param cadena cadena que se va a modificar.
  * @param longitudMinima (opcional) longitud mínima que debe tener la cadena resultante.
  * Este campo solo es útil cuando solo se quieren quitar algunos ceros.
  * @returns Devuelve la cadena sin ceros a la izquierda.
  * Ejemplos:
  *  Caso 1: No se establece una longitudMinima.
  *    - cadena: GS0001234, resultado: 1234
  *  Caso 2: Se establece una longitudMinima. La longitud mínima es mayor que la longitud de la cadena sin ceros.
  *    - cadena: GS0001234, longitudMinima: 5 resultado: 01234
  *  Caso 3: Se establece una longitdMinima. La longitud mínima es menor o igual que la longitud de la cadena sin ceros.
  *  La longitud mínima SE IGNORA.
  *    - cadena: GS0001234, longitudMinima: 3 resultado: 1234
  */
  static quitarCerosIzq = (cadena: string, longitudMinima?: number): string => {
    const cad = `${cadena}`;
    if (!cad || cad.trim() === '') return cad;
    const primerNumeroNoCero = cad.search(/[1-9]/);
    if (longitudMinima && (cad.length - primerNumeroNoCero) < longitudMinima) {
      return cad.substring(cad.length - longitudMinima);
    }
    return cad.substring(primerNumeroNoCero);
  };

  /**
  * Función que elimina de la cadena original cualquier caracter que no sea un número.
  * @param cadena Cadena que se va a modificar.
  * @returns Devuelve la cadena únicamente con números.
  */
  static soloNumeros = (cadena: string): string => {
    const cad = `${cadena}`;
    return cad.replace(/\D/g, '');
  };

  /**
  * Función que recorta una cadena a la longitud solicitada.
  * @param cadena Cadena que se va a modificar.
  * @param longitud Longitud de la cadena resultante.
  * @returns Devuelve una cadena con la longitud solicitada.
  * Ejemplos:
  *  Caso 1: Si la longitud es menor o igual que la longitud de la cadena original, se ejecuta la operación.
  *   - cadena: 0123456789, longitud: 5, resultado: 56789
  *  Case 2: Si la longitud es mayor que la cadena original, se devuelve la cadena original.
  */
  static recortarCadena = (cadena: string, longitud: number): string => {
    if (cadena.length <= longitud) return cadena;
    return cadena.substring(cadena.length - longitud);
  };

  static isBase64 = (str: any) => {
    if (typeof str !== 'string' || str.length % 4 !== 0) {
      return false;
    }
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Regex.test(str);
  };
  static processObject = (objetoCopy: any) => {
    const obj = JSON.parse(JSON.stringify(objetoCopy));
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'string' && this.isBase64(value)) {
        obj[key] = 'trucado';
      } else if (typeof value === 'object' && value !== null) {
        this.processObject(value);
      }
    });
    return obj;
  };

  static objetoSinArrays(obj: any) {
    if (typeof obj !== 'object') {
      return true;
    }
    for (var prop in obj) {
      if (Array.isArray(obj[prop])) {
        return false; // Si encuentra un array, devuelve falso
      }
    }
    return true; // Si no encuentra ningún array, devuelve verdadero
  }
  static calcularTiempoEjecucion = (param: {
    inicio: number
    final?: number
  }) => Math.trunc(param.final ? (param.final - param.inicio) : performance.now() - param.inicio)
}
