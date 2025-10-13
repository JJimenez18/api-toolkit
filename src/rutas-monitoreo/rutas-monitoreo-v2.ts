/* eslint-disable linebreak-style */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/ban-types */
import express from 'express';
import 'express-async-errors';
import { ControladorMonitoreoV2 } from './controlador-monitoreo-v2';
import { ValidadorRutasMonitoreo } from './validadores-rutas-monitoreo';
import { ValidadorErroresParametros } from '../middlewares';

export class RutasMonitoreoV2 {
  private static instance: RutasMonitoreoV2;

  // eslint-disable-next-line no-useless-constructor, @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): RutasMonitoreoV2 {
    if (!this.instance) {
      this.instance = new RutasMonitoreoV2();
    }
    return this.instance;
  }

  inicializar = (router: express.Router, basePatch: string): void => {
    const validador = new ValidadorRutasMonitoreo();
    const controladorMonitoreo = new ControladorMonitoreoV2();
    router.get(
      `${basePatch}/monitoreo/telnet`,
      validador.telnet(),
      ValidadorErroresParametros.validar,
      controladorMonitoreo.monitoreoTelnet,
    );

    router.get(
      `${basePatch}/monitoreo/ping`,
      validador.ping(),
      ValidadorErroresParametros.validar,
      controladorMonitoreo.monitoreoPing,
    );

    router.get(
      `${basePatch}/monitoreo/vivo`,
      controladorMonitoreo.monitoreoVivo,
    );

    router.get(`${basePatch}/status`, controladorMonitoreo.monitoreoVivo);

    router.get(
      `${basePatch}/monitoreo/disponible`,
      controladorMonitoreo.monitoreoVivo,
    );

    router.get(
      `${basePatch}/monitoreo/desconectar`,
      controladorMonitoreo.monitoreoVivo,
    );
  };
}
