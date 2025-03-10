import { validationResult } from 'express-validator';
import { validacionFecha } from '../src/utilerias/validadores-utils';

describe('validacionFecha', () => {
  const testField = 'fecha';

  it('should validate required field with correct format', async () => {
    const req = { body: { [testField]: '2023-01-01' } };
    const validations = validacionFecha(testField);
    
    // Run validations
    for (const validation of validations) {
      await validation(req, {}, () => {});
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBeTruthy();
  });

  it('should reject required field with incorrect format', async () => {
    const req = { body: { [testField]: '01-01-2023' } };
    const validations = validacionFecha(testField);
    
    // Run validations
    for (const validation of validations) {
      await validation(req, {}, () => {});
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBeFalsy();
    expect(errors.array()[0].msg).toContain('no cumple con el formato YYYY-MM-DD');
  });

  it('should reject empty required field', async () => {
    const req = { body: { [testField]: '' } };
    const validations = validacionFecha(testField);
    
    // Run validations
    for (const validation of validations) {
      await validation(req, {}, () => {});
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBeFalsy();
    expect(errors.array()[0].msg).toContain('debe contener información');
  });

  it('should validate optional field when present', async () => {
    const req = { body: { [testField]: '2023-01-01' } };
    const validations = validacionFecha(testField, true);
    
    // Run validations
    for (const validation of validations) {
      await validation(req, {}, () => {});
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBeTruthy();
  });

  it('should not validate optional field when missing', async () => {
    const req = { body: {} };
    const validations = validacionFecha(testField, true);
    
    // Run validations
    for (const validation of validations) {
      await validation(req, {}, () => {});
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBeTruthy();
  });

  it('should reject optional field with incorrect format', async () => {
    const req = { body: { [testField]: '2023/01/01' } };
    const validations = validacionFecha(testField, true);
    
    // Run validations
    for (const validation of validations) {
      await validation(req, {}, () => {});
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBeFalsy();
    expect(errors.array()[0].msg).toContain('no cumple con el formato YYYY-MM-DD');
  });
});