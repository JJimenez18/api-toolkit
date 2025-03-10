import {Response} from 'express';
import { EMensajesError } from '../src/enum/enums';
import { exitoApi, errorApi } from '../src/respuestas';
import { generaRespuesta } from '../src/utilerias/validadores-utils';

// Mock Express response object
const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
	res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('generaRespuesta', () => {
    let res: Response;

    beforeEach(() => {
        res = mockResponse();
        jest.clearAllMocks();
    });

    it('should return success response for 200 status code', async () => {
        const mockData = {codigoHttp: 200, objRespuesta: {data: 'test'}};
        const successSpy = jest.spyOn(exitoApi, 'exito');

        await generaRespuesta(mockData, res);

        expect(successSpy).toHaveBeenCalledWith(res, mockData.objRespuesta);
    });

	it('should return success response for 200 status code v2', async () => {
        const mockData = {codigoHttp: 200};
        const successSpy = jest.spyOn(exitoApi, 'exito');

        await generaRespuesta(mockData, res);

        expect(successSpy).toHaveBeenCalledWith(res, undefined);
    });

	it('should return success response for 201 status code', async () => {
        const mockData = {codigoHttp: 201, objRespuesta: {data: 'test'}};
        const successSpy = jest.spyOn(exitoApi, 'creado');

        await generaRespuesta(mockData, res);

        expect(successSpy).toHaveBeenCalledWith(res, mockData.objRespuesta);
    });

	it('should return success response for 201 status code v2', async () => {
        const mockData = {codigoHttp: 201};
        const successSpy = jest.spyOn(exitoApi, 'creado');

        await generaRespuesta(mockData, res);

        expect(successSpy).toHaveBeenCalledWith(res, undefined);
    });

    /* it('should return no content response for 204 status code', async () => {
        const mockData = {codigoHttp: 204};
        const noContentSpy = jest.spyOn(exitoApi, 'sinContenido');

        await generaRespuesta(mockData, res);

        expect(noContentSpy).toHaveBeenCalledWith(res);
    }); */

    it('should throw unauthorized error for 401 status code', async () => {
        const mockData = {codigoHttp: 401, mensaje: 'Unauthorized'};
        const errorSpy = jest.spyOn(errorApi.peticionNoAutorizada, 'parametrosNoValidos');

        await expect(generaRespuesta(mockData, res)).rejects.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(mockData.mensaje || EMensajesError.NOT_AUTH);
    });

    it('should throw bad request error for 400 status code', async () => {
        const mockData = {codigoHttp: 400, mensaje: 'Bad Request'};
        const errorSpy = jest.spyOn(errorApi.peticionNoValida, 'parametrosNoValidos');

        await expect(generaRespuesta(mockData, res)).rejects.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(mockData.mensaje || EMensajesError.BAD_REQ);
    });

    it('should throw not found error for 404 status code', async () => {
        const mockData = {codigoHttp: 404, mensaje: 'Not Found'};
        const errorSpy = jest.spyOn(errorApi.recursoNoEncontrado, 'recursoBDNoEncontrado');

        await expect(generaRespuesta(mockData, res)).rejects.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(mockData.mensaje || EMensajesError.NOT_FOUND);
    });

    it('should throw internal server error for unknown status code', async () => {
        const mockData = {codigoHttp: 500, mensaje: 'Server Error'};
        const errorSpy = jest.spyOn(errorApi.errorInternoServidor, 'desconocido');

        await expect(generaRespuesta(mockData, res)).rejects.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(mockData.mensaje || EMensajesError.ERROR);
    });

    it('should use default error message when not provided', async () => {
        const mockData = {codigoHttp: 401};
        const errorSpy = jest.spyOn(errorApi.peticionNoAutorizada, 'parametrosNoValidos');

        await expect(generaRespuesta(mockData, res)).rejects.toThrow();
        expect(errorSpy).toHaveBeenCalledWith(EMensajesError.NOT_AUTH);
    });
});
