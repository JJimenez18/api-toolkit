/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { Telnet } from 'telnet-client';
import { ping } from 'ping-tcp-js';
import { LoggerS3 } from '../middlewares';
import { errorApi, exitoApi } from '../respuestas';

export class ControladorMonitoreoV2 {
  private readonly logger = LoggerS3.getInstance().getLogger();

  // eslint-disable-next-line max-len
  monitoreoVivo = async (
    solicitud: Request,
    respuesta: Response,
  ): Promise<Response> => exitoApi.exito(respuesta, { mensaje: 'El servicio está vivo' });

  monitoreoPing = async (
    solicitud: Request,
    respuesta: Response,
  ): Promise<Response> => {
    const { host, puerto } = solicitud.query as any;
    let numeroPuerto;
    try {
      numeroPuerto = Number.parseInt(`${puerto}`, 10);
      const resultado = await ping({ host, port: numeroPuerto });
      return exitoApi.exito(respuesta, {
        mensaje: `Ping exitoso. Respuesta: ${resultado}, Host: ${host}, Puerto: ${numeroPuerto}`,
      });
    } catch (error: any) {
      this.logger.error(error.message);
      /* throw new ErrorServicioNoDisponible(
        ErrorServicioNoDisponibleCodigos.SIN_CONEXION_EXTERNA,
        `Ping no responde. Host: ${host}, Puerto: ${numeroPuerto}`,
      ); */
      throw errorApi.servicioNoDisponible.sinConexionExterna(
        `Ping no responde. Host: ${host}, Puerto: ${numeroPuerto}`,
      );
    }
  };

  monitoreoTelnet = async (
    solicitud: Request,
    respuesta: Response,
  ): Promise<Response> => {
    const { host, puerto } = solicitud.query;
    const opciones = {
      host: host?.toString(),
      port: Number.parseInt(puerto?.toString() || '0', 10),
      negotiationMandatory: false,
    };
    try {
      const conexion = new Telnet();
      await conexion.connect(opciones);
      await conexion.end();
      return exitoApi.exito(respuesta, {
        mensaje: `Telnet responde exitosamente. Host: ${opciones.host}, Puerto: ${opciones.port}`,
      });
    } catch (error: any) {
      this.logger.info(error);
      /* throw new ErrorServicioNoDisponible(
        ErrorServicioNoDisponibleCodigos.SIN_CONEXION_EXTERNA,
        `Telnet no responde. Host: ${opciones.host}, Puerto: ${opciones.port} --- ${error.message}`,
      ); */
      throw errorApi.servicioNoDisponible.sinConexionExterna(
        `Telnet no responde. Host: ${opciones.host}, Puerto: ${opciones.port} --- ${error.message}`,
      );
    }
  };
}
