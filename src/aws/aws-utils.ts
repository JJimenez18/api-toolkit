import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const REGION = 'us-east-1';

export const obtenerParametroSSM = async <T>(nombre: string): Promise<T> => {
    const client = new SSMClient({ region: REGION });
    try {
        const command = new GetParameterCommand({ Name: nombre, WithDecryption: true });
        const response = await client.send(command);
        const valor = response.Parameter?.Value || '[]';
        return JSON.parse(valor) as T;
    } catch (error) {
        throw new Error(`Error obteniendo SSM Param ${nombre}: ${error}`);
    }
};

export const obtenerParametroSSMRaw = async (nombre: string): Promise<string> => {
    const client = new SSMClient({ region: REGION });
    try {
        const command = new GetParameterCommand({ Name: nombre, WithDecryption: true });
        const response = await client.send(command);
        return response.Parameter?.Value || '';
    } catch (error) {
        throw new Error(`Error SSM ${nombre}: ${error}`);
    }
};

export const obtenerSecretoAWS = async (nombreSecreto: string): Promise<string> => {
    const client = new SecretsManagerClient({ region: REGION });
    try {
        const command = new GetSecretValueCommand({ SecretId: nombreSecreto });
        const response = await client.send(command);
        return response.SecretString || '';
    } catch (error) {
        throw new Error(`Error obteniendo Secreto ${nombreSecreto}: ${error}`);
    }
};

export * from '.';