import crypto, { createCipheriv, randomBytes, createDecipheriv } from "crypto";
import { ICifradoResponse } from "./tipos";

const generaRegex = () => /warn/i;
const buscaCombinacionEnCadena = (cadena: string): boolean => {
  const regex = generaRegex();
  return regex.test(cadena);
};

const MAX_RECURSION_DEPTH = 10;
export class Cifrado {
  private static instance: Cifrado;

  static getInstance(): Cifrado {
    if (!this.instance) {
      this.instance = new Cifrado();
    }
    return this.instance;
  }

  private encriptarRSAPSK1 = (
    valor: string,
    keyPublica: string
  ): ICifradoResponse => {
    const resp: ICifradoResponse = {
      error: true,
      mensaje: "",
      valor: "",
    };
    try {
      const publica = [
        "-----BEGIN PUBLIC KEY-----",
        keyPublica,
        "-----END PUBLIC KEY-----",
      ].join("\n");
      const cifrarRsaa = crypto
        .publicEncrypt(
          {
            key: publica,
            padding: crypto.constants.RSA_PKCS1_PADDING,
          },
          Buffer.from(valor, "utf8")
        )
        .toString("base64");
      resp.error = false;
      resp.valor = cifrarRsaa;
    } catch (error: any) {
      resp.mensaje = error.message || error.msg;
    }
    return resp;
  };

  public descifraRSAPSK1 = (
    valorCifrado: string,
    keyPrivada: string
  ): ICifradoResponse => {
    const resp: ICifradoResponse = {
      error: true,
      mensaje: "",
      valor: "",
    };
    try {
      const llavePriv = [
        "-----BEGIN PRIVATE KEY-----",
        keyPrivada,
        "-----END PRIVATE KEY-----",
      ].join("\n");
      console.log(llavePriv);
      const x = crypto
        .privateDecrypt(
          { key: llavePriv, padding: crypto.constants.RSA_PKCS1_PADDING },
          Buffer.from(valorCifrado, "base64")
        )
        .toString("utf8");
      //return crypto.privateDecrypt(llavePriv, Buffer.from(encrypted, 'base64'));
      resp.error = false;
      resp.valor = x;
    } catch (error: any) {
      resp.mensaje = error.message || error.msg;
    }
    return resp;
  };

  private encriptarRSAOAEP = (
    valor: string,
    keyPublica: string
  ): ICifradoResponse => {
    let valorCifrado = "";
    const resp: ICifradoResponse = {
      error: true,
      mensaje: "",
      valor: "",
    };
    try {
      const publica = [
        "-----BEGIN PUBLIC KEY-----",
        keyPublica,
        "-----END PUBLIC KEY-----",
      ].join("\n");

      valorCifrado = crypto
        .publicEncrypt(
          {
            key: publica,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          Buffer.from(valor, "utf8")
        )
        .toString("base64");
      resp.error = false;
      resp.valor = valorCifrado;
      // console.log('valorCifrado ', valorCifrado)
    } catch (error: any) {
      console.log(error, error.msg);
      resp.mensaje = error.msg;
    }
    return resp;
  };

  public descifrarRSAOAEP = (
    valorCifrado: string,
    keyPrivada: string
  ): ICifradoResponse => {
    const resp: ICifradoResponse = {
      error: true,
      mensaje: "",
      valor: "",
    };
    try {
      const privada = [
        "-----BEGIN PRIVATE KEY-----",
        keyPrivada,
        "-----END PRIVATE KEY-----",
      ].join("\n");
      const valorDecifrado = Buffer.from(
        crypto.privateDecrypt(
          {
            key: privada,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          Buffer.from(valorCifrado, "base64")
        )
      ).toString("utf8");
      // console.log('valorDecifrado ', valorDecifrado)
      resp.error = false;
      resp.valor = valorDecifrado;
    } catch (error: any) {
      console.log(error, error.msg);
      resp.mensaje = error.msg;
    }
    return resp;
  };

  private validaRSAPSK = (
    cadena: string,
    keyPublica: string,
    depth = 0
  ): string => {
    const { valor, error } = this.encriptarRSAPSK1(cadena, keyPublica);
    if (error) {
      if (depth < MAX_RECURSION_DEPTH) {
        return this.validaRSAPSK(cadena, keyPublica, depth + 1);
      } else {
        return "";
      }
    }
    const foundMatches = buscaCombinacionEnCadena(valor);
    if (foundMatches) {
      // Si se encuentran coincidencias, se vuelve a cifrar
      if (depth < MAX_RECURSION_DEPTH) {
        return this.validaRSAPSK(cadena, keyPublica, depth + 1);
      }
    }
    return valor;
  };

  private validaRSAOAEP = (
    cadena: string,
    keyPublica: string,
    depth = 0
  ): string => {
    const { valor, error } = this.encriptarRSAOAEP(cadena, keyPublica);
    if (error) {
      if (depth < MAX_RECURSION_DEPTH) {
        return this.validaRSAOAEP(cadena, keyPublica, depth + 1);
      } else {
        return "";
      }
    }
    const foundMatches = buscaCombinacionEnCadena(valor);
    if (foundMatches) {
      // Si se encuentran coincidencias, se vuelve a cifrar
      if (depth < MAX_RECURSION_DEPTH) {
        return this.validaRSAOAEP(cadena, keyPublica, depth + 1);
      }
    }
    return valor;
  };

  public validaCadenaRSA = (
    cadena: string,
    keyPublica: string,
    oaep = false
  ): string => {
    switch (oaep) {
      case true: {
        return this.validaRSAOAEP(cadena, keyPublica);
      }

      default: {
        return this.validaRSAPSK(cadena, keyPublica);
      }
    }
  };

  private encriptar_AES_CBC_PKCS5 = (
    valor: string,
    accesoSimetrico: string,
    codigoAutentificacionHash: string
  ): ICifradoResponse => {
    const resp: ICifradoResponse = {
      error: true,
      mensaje: "",
      valor: "",
    };
    try {
      const aesKey = Buffer.from(accesoSimetrico, "base64");
      const hmacKey = Buffer.from(codigoAutentificacionHash, "base64");
      let algoritmo = "";
      switch (aesKey.length) {
        case 16:
          algoritmo = "aes-128-cbc";
        case 32:
          algoritmo = "aes-256-cbc";
      }
      // console.log('usamos este algoritmo jajaj', algoritmo);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algoritmo, aesKey, iv);
      let cipherText = cipher.update(valor, "utf8");
      const final = Buffer.concat([cipherText, cipher.final()]);
      // console.log('lengt', final.length);
      const iv_cipherText = Buffer.concat([iv, final]);
      // console.log('final', final.toString('base64'));
      // console.log('concatena', iv_cipherText.length);
      const hmac = crypto
        .createHmac("sha256", hmacKey)
        .update(iv_cipherText)
        .digest("base64");
      const bytes = Buffer.from(hmac, "base64");
      const iv_cipherText_hmac = Buffer.concat([iv_cipherText, bytes]);
      // console.log(iv_cipherText_hmac.length);
      const iv_cipherText_hmac_base64 =
        Buffer.from(iv_cipherText_hmac).toString("base64");
      resp.error = false;
      resp.valor = iv_cipherText_hmac_base64;
    } catch (error: any) {
      // console.log(error, error.msg);
      resp.mensaje = error.msg;
    }
    return resp;
  };

  private valida_AES_CBC_PKCS5 = (
    cadena: string,
    accesoSimetrico: string,
    codigoAutentificacionHash: string,
    depth = 0
  ): string => {
    const { valor, error } = this.encriptar_AES_CBC_PKCS5(
      cadena,
      accesoSimetrico,
      codigoAutentificacionHash
    );
    if (error) {
      if (depth < MAX_RECURSION_DEPTH) {
        return this.valida_AES_CBC_PKCS5(
          cadena,
          accesoSimetrico,
          codigoAutentificacionHash,
          depth + 1
        );
      } else {
        return "";
      }
    }
    const foundMatches = buscaCombinacionEnCadena(valor);
    if (foundMatches) {
      // Si se encuentran coincidencias, se vuelve a cifrar
      if (depth < MAX_RECURSION_DEPTH) {
        return this.valida_AES_CBC_PKCS5(
          cadena,
          accesoSimetrico,
          codigoAutentificacionHash,
          depth + 1
        );
      }
    }
    return valor;
  };

  private encriptar_AES_GCM_NoPadding = (
    cadena: string,
    accesoSimetrico: string,
    codigoAutentificacionHash: string = ""
  ): ICifradoResponse => {
    const resp: ICifradoResponse = {
      error: true,
      mensaje: "",
      valor: "",
    };
    try {
      // Convertir la clave simétrica desde base64 a Buffer
      const aesKey = Buffer.from(accesoSimetrico, "base64");
      // Verificar la longitud de la clave
      if (![16, 32].includes(aesKey.length)) {
        resp.mensaje = "Invalid AES key length";
        return resp;
        // throw new Error('Invalid AES key length');
      }
      // Generar un IV aleatorio de 12 bytes
      const iv = randomBytes(12); // AES GCM requiere un IV de 12 bytes
      // Los datos asociados para la autenticación (puedes ajustarlo según tu caso)
      const associatedData = Buffer.from("ProtocolVersion1", "utf-8");
      // Establecer el algoritmo de cifrado
      const algorithm = "aes-256-gcm";
      // Crear el cifrador
      const cipher = createCipheriv(algorithm, aesKey, iv);
      // Establecer los datos asociados (AAD) para la autenticación
      cipher.setAAD(associatedData);
      // Cifrar el texto plano
      let encrypted = cipher.update(cadena, "utf-8", "base64");
      encrypted += cipher.final("base64"); // Finalizar el cifrado
      // Obtener el tag de autenticación
      const authTag = cipher.getAuthTag();
      // Combinar el IV, el texto cifrado y el tag en una cadena codificada en base64
      const result = Buffer.concat([
        iv,
        Buffer.from(encrypted, "base64"),
        authTag,
      ]).toString("base64");
      resp.valor = result; // Retornar el texto cifrado combinado con IV y tag
      resp.error = false;
    } catch (error: any) {
      console.log(`Problema en cifrado ${error.message}`);
      resp.mensaje = `Problema en cifrado ${error.message}`;
    }
    return resp;
  };

  public decifrar_AES_GCM_NoPadding = (
    cifradoBase64: string,
    accesoSimetrico: string,
    codigoAutentificacionHash: string = ""
  ): ICifradoResponse => {
    const resp: ICifradoResponse = {
      error: true,
      mensaje: "",
      valor: "",
    };
    try {
      // Convertir clave simétrica desde base64 a Buffer
      const aesKey = Buffer.from(accesoSimetrico, "base64");

      if (![16, 32].includes(aesKey.length)) {
        resp.mensaje = "Invalid AES key length";
        return resp;
      }

      // Decodificar el mensaje base64 recibido
      const encryptedData = Buffer.from(cifradoBase64, "base64");

      // Extraer IV (primeros 12 bytes)
      const iv = encryptedData.slice(0, 12);

      // Extraer AuthTag (últimos 16 bytes)
      const authTag = encryptedData.slice(encryptedData.length - 16);

      // Extraer texto cifrado (entre IV y AuthTag)
      const encryptedText = encryptedData.slice(12, encryptedData.length - 16);

      const algorithm = "aes-256-gcm";
      const decipher = createDecipheriv(algorithm, aesKey, iv);

      // Establecer los datos asociados (deben ser los mismos del cifrado)
      const associatedData = Buffer.from("ProtocolVersion1", "utf-8");
      decipher.setAAD(associatedData);

      // Establecer AuthTag para verificar integridad
      decipher.setAuthTag(authTag);

      // Descifrar
      let decrypted = decipher.update(encryptedText, undefined, "utf-8");
      decrypted += decipher.final("utf-8");

      resp.valor = decrypted;
      resp.error = false;
    } catch (error: any) {
      console.log(`Problema en descifrado ${error.message}`);
      resp.mensaje = `Problema en descifrado ${error.message}`;
    }
    return resp;
  };

  private valida_AES_GCM_NoPadding = (
    cadena: string,
    accesoSimetrico: string,
    codigoAutentificacionHash: string = "",
    depth = 0
  ): string => {
    const { valor, error } = this.encriptar_AES_GCM_NoPadding(
      cadena,
      accesoSimetrico,
      codigoAutentificacionHash
    );
    if (error) {
      if (depth < MAX_RECURSION_DEPTH) {
        return this.valida_AES_GCM_NoPadding(
          cadena,
          accesoSimetrico,
          codigoAutentificacionHash,
          depth + 1
        );
      } else {
        return "";
      }
    }
    const foundMatches = buscaCombinacionEnCadena(valor);
    if (foundMatches) {
      // Si se encuentran coincidencias, se vuelve a cifrar
      if (depth < MAX_RECURSION_DEPTH) {
        return this.valida_AES_GCM_NoPadding(
          cadena,
          accesoSimetrico,
          codigoAutentificacionHash,
          depth + 1
        );
      }
    }
    return valor;
  };

  public descifrar_AES_CBC_PKCS5 = (
    valorCifrado: string,
    accesoSimetrico: string,
    codigoAutentificacionHash: string
  ): ICifradoResponse => {
    const resp: ICifradoResponse = {
      error: true,
      mensaje: "",
      valor: "",
    };
    try {
      const IV_SIZE = 16;
      const aesKey = Buffer.from(accesoSimetrico, "base64");
      const hmacKey = Buffer.from(codigoAutentificacionHash, "base64");
      const iv_cipherText_hmac = Buffer.from(valorCifrado, "base64");
      let algoritmo = "";
      switch (aesKey.length) {
        case 16:
          algoritmo = "aes-128-cbc";
        case 32:
          algoritmo = "aes-256-cbc";
      }
      const cipherTextLength = iv_cipherText_hmac.length - hmacKey.length;
      const iv = iv_cipherText_hmac.slice(0, IV_SIZE);
      const cipherText = iv_cipherText_hmac.slice(IV_SIZE, cipherTextLength);
      const iv_cipherText = Buffer.concat([iv, cipherText]);
      const receivedHMAC = iv_cipherText_hmac.slice(
        cipherTextLength,
        iv_cipherText_hmac.length
      );
      const calculatedHMAC = crypto
        .createHmac("sha256", hmacKey)
        .update(iv_cipherText)
        .digest("base64");
      console.log(receivedHMAC.length);
      const bytes = Buffer.from(calculatedHMAC, "base64");
      if (receivedHMAC.length == bytes.length) {
        console.log("si entra");
        const decipher = crypto.createDecipheriv(algoritmo, aesKey, iv);
        let decrypted = decipher.update(cipherText);
        const final = Buffer.concat([decrypted, decipher.final()]);
        const cadena = final.toString("utf8");
        resp.error = false;
        resp.valor = cadena;
      }
    } catch (error: any) {
      console.log(error, error.msg);
      resp.mensaje = error.msg;
    }
    return resp;
  };

  public validaCadenaAES = (
    cadena: string,
    accesoSimetrico: string,
    codigoAutentificacionHash: string,
    gcm_noPadding = false
  ): string => {
    if (gcm_noPadding) {
      return this.valida_AES_GCM_NoPadding(
        cadena,
        accesoSimetrico,
        codigoAutentificacionHash
      );
    } else {
      return this.valida_AES_CBC_PKCS5(
        cadena,
        accesoSimetrico,
        codigoAutentificacionHash
      );
    }
  };

  public cifrar_AES_GCM_NoPadding_V2 = (
        textoPlano: string,
        accesoSimetrico: string,
        codigoAutentificacionHash: string,
    ): ICifradoResponse => {
        const resp: ICifradoResponse = {
            error: true,
            mensaje: '',
            valor: '',
        };

        try {
            // Convertir clave simétrica desde base64 a Buffer
            const aesKey = Buffer.from(accesoSimetrico, 'base64');

            let algorithm: string;
            if (aesKey.length === 16) {
                algorithm = 'aes-128-gcm';
            } else if (aesKey.length === 32) {
                algorithm = 'aes-256-gcm';
            } else {
                resp.mensaje = 'Longitud de clave AES inválida (debe ser 128 o 256 bits)';
                return resp;
            }

            // Generar IV (12 bytes recomendado para GCM)
            const iv = randomBytes(12);

            // Crear instancia de cifrado
            const cipher: any = createCipheriv(algorithm, aesKey, iv);

            // Agregar datos asociados (AAD) si aplica
            // if (codigoAutentificacionHash) {
            cipher.setAAD(Buffer.from(codigoAutentificacionHash, 'utf-8'));
            // }

            // Cifrar
            let encrypted = cipher.update(textoPlano, 'utf-8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);

            // Obtener AuthTag
            const authTag = cipher.getAuthTag();

            // Concatenar IV + TextoCifrado + AuthTag
            const encryptedData = Buffer.concat([iv, encrypted, authTag]);

            // Codificar en base64 para transporte
            resp.valor = encryptedData.toString('base64');
            resp.error = false;
        } catch (error: any) {
            console.error(`Problema en cifrado: ${error.message}`);
            resp.mensaje = `Problema en cifrado: ${error.message}`;
        }

        return resp;
    };

    public decifrar_AES_GCM_NoPadding_V2 = (
        cifradoBase64: string,
        accesoSimetrico: string,
        codigoAutentificacionHash: string,
    ): ICifradoResponse => {
        const resp: ICifradoResponse = {
            error: true,
            mensaje: '',
            valor: '',
        };

        try {
            // Convertir clave simétrica desde base64 a Buffer
            const aesKey = Buffer.from(accesoSimetrico, 'base64');

            let algorithm: string;
            if (aesKey.length === 16) {
                algorithm = 'aes-128-gcm';
            } else if (aesKey.length === 32) {
                algorithm = 'aes-256-gcm';
            } else {
                resp.mensaje = 'Longitud de clave AES inválida (debe ser 128 o 256 bits)';
                return resp;
            }
            console.log('🚀 ~ SolicitudesController ~ algorithm:', algorithm);

            // Decodificar el mensaje base64 recibido
            const encryptedData = Buffer.from(cifradoBase64, 'base64');

            // Extraer IV (primeros 12 bytes)
            const iv = encryptedData.slice(0, 12);

            // Extraer AuthTag (últimos 16 bytes)
            const authTag = encryptedData.slice(encryptedData.length - 16);

            // Extraer texto cifrado (entre IV y AuthTag)
            const encryptedText = encryptedData.slice(12, encryptedData.length - 16);

            const decipher: any = createDecipheriv(algorithm, aesKey, iv);

            // Establecer los datos asociados (si el backend los usó al cifrar)
            // if (codigoAutentificacionHash) {
            decipher.setAAD(Buffer.from(codigoAutentificacionHash, 'utf-8'));
            // }

            // Establecer AuthTag para verificar integridad
            decipher.setAuthTag(authTag);

            // Descifrar
            let decrypted = decipher.update(encryptedText, undefined, 'utf-8');
            decrypted += decipher.final('utf-8');

            resp.valor = decrypted;
            resp.error = false;
        } catch (error: any) {
            console.error(`Problema en descifrado: ${error.message}`);
            resp.mensaje = `Problema en descifrado: ${error.message}`;
        }
        return resp;
    };

}
