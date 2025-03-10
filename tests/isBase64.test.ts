import { validationResult } from 'express-validator';
import { validaCadenaNoCifrada } from '../src/utilerias/validadores-utils';

describe('validaCadenaNoCifrada', () => {
  const testValidation = async (field: string, value: any, optional = false) => {
    const req = { body: { [field]: value } };
    const validations = validaCadenaNoCifrada(field, optional);
    for (const validation of validations) {
      await validation(req, {}, () => {});
    }
    return validationResult(req);
  };

  it('should reject empty string when not optional', async () => {
    const result = await testValidation('testField', '');
    expect(result.array()).toHaveLength(1);
    expect(result.array()[0].msg).toBe('El campo testField es requerido y debe contener información');
  });

  it('should accept empty string when optional', async () => {
    const result = await testValidation('testField', '', true);
    expect(result.array()).toHaveLength(1);
  });

  it('should reject non-string values', async () => {
    const result = await testValidation('testField', 123);
    expect(result.array()).toHaveLength(1);
    expect(result.array()[0].msg).toBe('El campo testField es de tipo cadena (string)');
  });

  it('should reject Base64 encoded strings', async () => {
    const result = await testValidation('testField', 'aGVsbG8gd29ybGQ='); // "hello world" in Base64
    expect(result.array()).toHaveLength(1);
    expect(result.array()[0].msg).toBe('El campo testField no debe ser un base64');
  });

  it('should accept regular strings', async () => {
    const result = await testValidation('testField', 'hello world todo esta bien probando');
    expect(result.array()).toHaveLength(0);
  });

  it('should accept undefined when optional', async () => {
    const result = await testValidation('testField', undefined, true);
    expect(result.array()).toHaveLength(0);
  });

  it('should reject undefined when not optional', async () => {
    const result = await testValidation('testField', undefined);
    expect(result.array()).toHaveLength(1);
    expect(result.array()[0].msg).toBe('El campo testField es requerido y debe contener información');
  });
});