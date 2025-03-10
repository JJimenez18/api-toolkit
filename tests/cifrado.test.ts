import {Cifrado} from '../src/cifrado/cifrado';

describe('Cifrado', () => {
    let cifrado: Cifrado = Cifrado.getInstance();
    const mockAccesoSimetrico = 'hD/Qnl10OZfdBRbVZfWAoy/J2EefiZ5zqnwE4XHZiDM=';
    const mockCodigoAutentificacionHash = 'NcMXd+PPo3T6AKvh5sCKDOol1pfhrJIdoEusZnPPx4I=';
    describe('validaCadenaAES', () => {
        it('should use AES_CBC_PKCS5 by default', () => {
            const spyCBC = jest.spyOn(cifrado as any, 'valida_AES_CBC_PKCS5');
            const spyGCM = jest.spyOn(cifrado as any, 'valida_AES_GCM_NoPadding');

            cifrado.validaCadenaAES('test', mockAccesoSimetrico, mockCodigoAutentificacionHash);

            expect(spyCBC).toHaveBeenCalled();
            expect(spyGCM).not.toHaveBeenCalled();
        });

        it('should use AES_GCM_NoPadding when gcm_noPadding is true', () => {
            const spyGCM = jest.spyOn(cifrado as any, 'valida_AES_GCM_NoPadding');

            cifrado.validaCadenaAES('test', mockAccesoSimetrico, mockCodigoAutentificacionHash, true);

            expect(spyGCM).toHaveBeenCalled();
        });

        it('should pass correct parameters to encryption methods', () => {
            const testString = 'test string';
            const spyCBC = jest.spyOn(cifrado as any, 'valida_AES_CBC_PKCS5');

            cifrado.validaCadenaAES(testString, mockAccesoSimetrico, mockCodigoAutentificacionHash);

            expect(spyCBC).toHaveBeenCalledWith(testString, mockAccesoSimetrico, mockCodigoAutentificacionHash);
        });

        it('should return encrypted string from CBC method', () => {
            const mockEncrypted = 'mockEncryptedString';
            jest.spyOn(cifrado as any, 'valida_AES_CBC_PKCS5').mockReturnValue(mockEncrypted);

            const result = cifrado.validaCadenaAES('test', mockAccesoSimetrico, mockCodigoAutentificacionHash);

            expect(result).toBe(mockEncrypted);
        });

        it('should return encrypted string from GCM method', () => {
            const mockEncrypted = 'mockEncryptedStringGCM';
            jest.spyOn(cifrado as any, 'valida_AES_GCM_NoPadding').mockReturnValue(mockEncrypted);

            const result = cifrado.validaCadenaAES('test', mockAccesoSimetrico, mockCodigoAutentificacionHash, true);

            expect(result).toBe(mockEncrypted);
        });
    });
});
