export interface IRespuestaGenerica<T> {
    codigoHttp: number;
    resultado?: T;
    detalles: string;
}

export interface IDetalleServicio {
    servicio: string;
    sistema: string;
    tiempo: number;
}
