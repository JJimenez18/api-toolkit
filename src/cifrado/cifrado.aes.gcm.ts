import { randomBytes, createCipheriv, createDecipheriv, hkdfSync } from 'crypto';

export class CryptoServiceAESGCM {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly KEY_LEN = 32;

  /**
   * Deriva una llave segura combinando la llave AES y la llave Hash.
   * La mantenemos privada ya que es de uso interno para el cifrado/descifrado.
   */
  private deriveSecureSessionKey(aesKey: string | Buffer, hashKey: string | Buffer): Buffer {
    const derivedArrayBuffer = hkdfSync(
      'sha256', 
      aesKey, 
      hashKey, 
      'aes_encryption', 
      this.KEY_LEN
    );
    return Buffer.from(derivedArrayBuffer);
  }

  /**
   * Cifra un texto plano
   */
  public encrypt(text: string, aesKey: string, hashKey: string): string {
    const derivedKey = this.deriveSecureSessionKey(aesKey, hashKey);
    const iv = randomBytes(this.IV_LENGTH);

    const cipher = createCipheriv(this.ALGORITHM, derivedKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'), 
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Estructura: IV (12b) + Tag (16b) + Datos Cifrados
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  /**
   * Descifra un texto en base64
   */
  public decrypt(cipherTextBase64: string, aesKey: string, hashKey: string): string {
    const derivedKey = this.deriveSecureSessionKey(aesKey, hashKey);
    const data = Buffer.from(cipherTextBase64, 'base64');

    // Extraer las partes del buffer
    const iv = data.subarray(0, this.IV_LENGTH);
    const authTag = data.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
    const encryptedText = data.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(this.ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedText), 
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }
}