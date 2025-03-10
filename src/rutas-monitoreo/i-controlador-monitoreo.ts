import { Response, Request } from 'express';

export interface IControlMonitoreo {
  monitoreoVivo(solicitud: Request, respuesta: Response): Promise<Response>;
  monitoreoPing(solicitud: Request, respuesta: Response):Promise<Response>;
  monitoreoTelnet(solicitud: Request, respuesta: Response):Promise<Response>;
}
