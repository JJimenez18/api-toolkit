import jwt from "jsonwebtoken";

/**
 *
 * Clase para la gestion de JWT, contiene diversas funcionalidades.
 *
 */

export class JwtService {
  // declaramos el singleton de la clase
  private static instanceof: JwtService;

  /**
   *
   * @param
   * @param JwtService Singleton de la clase
   */
  constructor() {
    if (JwtService.instanceof) {
      throw new Error("Singleton already exists");
    }
    JwtService.instanceof = this;
  }

  /**
   *
   * @param data Objeto que se va a cifrar
   * @returns Objeto con el estado y el token cifrado
   */
  public encryptResponseMiddleware(
    data: any,
    keyPrivBack: string
  ): { status: string; data: string } {
    try {
      const privateKey = `-----BEGIN PRIVATE KEY-----\n${keyPrivBack}\n-----END PRIVATE KEY-----`;
      const now = new Date();
      // Establecer la fecha de expiración a hoy a las 23:59:59 en UTC
      const expiration = new Date();
      expiration.setUTCHours(23, 59, 59, 999); // 23:59:59.999 UTC (último milisegundo del día)
      // Calcular la diferencia en segundos
      const expiresIn = Math.floor(
        (expiration.getTime() - now.getTime()) / 1000
      );
      // Firmar el objeto de respuesta con la clave privada
      const token = jwt.sign(data, privateKey, {
        algorithm: "RS256",
        expiresIn,
      });
      return { status: "approved", data: token };
    } catch (error: any) {
      console.log(error.message);
      return { status: "rejected", data: "" };
    }
  }

  public verifyJWT = (token: string, keyPubClient: string): { data: any } => {
    const publicKey = `-----BEGIN PUBLIC KEY-----\n${keyPubClient}\n-----END PUBLIC KEY-----`;
    try {
      const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
      console.log("Objeto decifrado:", decoded, typeof decoded);
      // solicitudes/busquedas POST return folio = '93293129f99fs'
      // <urlgestorioa>/v1/solicitudes/busquedas
      return { data: decoded };
    } catch (error) {
      console.error("Error al decifrar:", error);
      return { data: "" };
    }
  };
}
