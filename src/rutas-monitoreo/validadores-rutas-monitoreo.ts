import { query, ValidationChain } from 'express-validator';
import { IValidadorRutasMonitoreo } from './i-validadores-rutas-monitoreo';

export class ValidadorRutasMonitoreo implements IValidadorRutasMonitoreo {
  ping = ():Array<ValidationChain> => [
    query('host').notEmpty().withMessage('El host es requerido'),
    query('puerto')
      .notEmpty().withMessage('El puerto es requerido').bail()
      .isInt({ allow_leading_zeroes: false, min: 0, max: 65535 })
      .withMessage('El puerto debe ser un número entre 0 y 65535')
      .bail(),
  ];

  telnet = ():Array<ValidationChain> => [
    query('host')
      .notEmpty().withMessage('El host es requerido').bail()
      .isIP(4)
      .withMessage('El host debe ser una ip válida')
      .bail(),
    query('puerto')
      .notEmpty().withMessage('El puerto es requerido').bail()
      .isInt({ allow_leading_zeroes: false, min: 0, max: 65535 })
      .withMessage('El puerto debe ser un número entre 0 y 65535')
      .bail(),
  ]
}
