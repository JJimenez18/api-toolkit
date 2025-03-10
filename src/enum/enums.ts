export enum EMensajesError {
    NOT_TOKEN = 'El token no es válido. Verifique por favor.',
    NOT_FOUND = 'No se encuentra ningún elemento relacionado a la consulta.',
    ERROR = 'Problemas al procesar su solicitud, favor de contactar a su administrador.',
    NOT_AUTH = 'El x-id-acceso está expirado o no es válido, favor de solicitar uno nuevo',
    KEY_ERROR = 'El cifrado de la cadena no es válido o no corresponde con el x-id-acceso proporcionado.',
    BAD_REQ = 'No fue posible procesar la información enviada en su solicitud. Verifique por favor.',
}

export enum SistemasEnum {
    DOCUMENT = 1,
    AURORA = 2,
    CRYPTO = 3,
    SAP_CPI = 4,
    FUSION = 5,
    UI = 6,
    AF = 7,
    SAP_MM = 8,
    SAP_FI = 9,
    APIGEE = 10,
    AXIOS = 11,
    GENERA_REFERENCIAS = 12
}
