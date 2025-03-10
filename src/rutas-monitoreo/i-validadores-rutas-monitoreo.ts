import { ValidationChain } from 'express-validator';

export interface IValidadorRutasMonitoreo {
  ping():Array<ValidationChain>;
  telnet():Array<ValidationChain>;
}
