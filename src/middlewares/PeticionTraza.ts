import { Request, Response, NextFunction } from "express";
import { performance } from "perf_hooks";
import { LoggerS3 } from "./LoggerS3";

export class PeticionTraza {
  static calcularTiempoEjecucion = (param: {
    inicio: number;
    final?: number;
  }) =>
    Math.trunc(
      param.final
        ? param.final - param.inicio
        : performance.now() - param.inicio
    );

  static isBase64 = (str: any) => {
    if (typeof str !== "string" || str.length % 4 !== 0) {
      return false;
    }
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Regex.test(str);
  };

  static processObject = (objetoCopy: any) => {
    if (!objetoCopy) return objetoCopy;

    const obj = JSON.parse(JSON.stringify(objetoCopy));

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (
        typeof value === "string" &&
        PeticionTraza.isBase64(value) &&
        value.length > 500
      ) {
        obj[key] = "trucado";
      } else if (typeof value === "object" && value !== null) {
        obj[key] = PeticionTraza.processObject(value);
      }
    });
    return obj;
  };

  static pintarTraza = (req: Request, res: Response, next: NextFunction) => {
    const { body, query, method, headers, ip, url } = req;
    const inicio = performance.now();

    res.locals.tiempoTotal = inicio;

    const bodyParseado = PeticionTraza.processObject(body);

    LoggerS3.getInstance()
      .getLogger()
      .info(
        JSON.stringify({
          ip: ip,
          method: method,
          url: url,
          headers: headers,
          query: query,
          body: bodyParseado,
          message: "Inicio de petición",
        })
      );

    res.on("finish", () => {
      const tiempoFinal = performance.now();
      LoggerS3.getInstance()
        .getLogger()
        .info(
          JSON.stringify({
            status: res.statusCode,
            tiempo: PeticionTraza.calcularTiempoEjecucion({
              inicio,
              final: tiempoFinal,
            }),
            message: "Finalización de petición",
          })
        );
    });

    res.on("close", () => {
      if (!res.headersSent) {
        const tiempoFinal = performance.now();
        LoggerS3.getInstance()
          .getLogger()
          .info(
            JSON.stringify({
              tiempo: PeticionTraza.calcularTiempoEjecucion({
                inicio,
                final: tiempoFinal,
              }),
              message: "La conexión se cerró antes de tiempo",
            })
          );
      }
    });

    next();
  };
}
