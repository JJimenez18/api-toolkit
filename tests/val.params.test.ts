import {convertidor} from '../src/middlewares';

describe('convertidor function', () => {
    test('should handle single error without code', () => {
        const input = ['Invalid parameter'];
        const result = convertidor(input);
        expect(result).toEqual({
            mensajesError: ['Invalid parameter'],
            codigoError: 4000,
        });
    });

    test('should handle single error with code', () => {
        const input = ['Invalid parameter.4001'];
        const result = convertidor(input);
        expect(result).toEqual({
            mensajesError: ['Invalid parameter'],
            codigoError: 4001,
        });
    });

    test('should handle multiple errors without codes', () => {
        const input = ['Invalid parameter 1', 'Invalid parameter 2'];
        const result = convertidor(input);
        expect(result).toEqual({
            mensajesError: ['Invalid parameter 1', 'Invalid parameter 2'],
            codigoError: 4007,
        });
    });

    test('should handle multiple errors with codes', () => {
        const input = ['Invalid parameter 1.4001', 'Invalid parameter 2.4002'];
        const result = convertidor(input);
        expect(result).toEqual({
            mensajesError: ['Invalid parameter 1', 'Invalid parameter 2'],
            codigoError: 4007,
        });
    });

    test('should handle mixed errors with and without codes', () => {
        const input = ['Invalid parameter 1.4001', 'Invalid parameter 2'];
        const result = convertidor(input);
        expect(result).toEqual({
            mensajesError: ['Invalid parameter 1', 'Invalid parameter 2'],
            codigoError: 4007,
        });
    });

    test('should handle invalid code format', () => {
        const input = ['Invalid parameter.abc'];
        const result = convertidor(input);
        expect(result).toEqual({
            mensajesError: ['Invalid parameter'],
            codigoError: 4000,
        });
    });

    test('should handle multiple dots in message', () => {
        const input = ['Invalid.parameter.4001'];
        const result = convertidor(input);
        expect(result).toEqual({
            mensajesError: ['Invalid.parameter'],
            codigoError: 4001,
        });
    });
});
