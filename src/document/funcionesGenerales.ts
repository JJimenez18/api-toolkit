import { FilterQuery, Model, QueryOptions, Types, UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import { SistemasEnum, EMensajesError } from '../enum';
import { iniciaTiempo, calculaTiempo, LoggerLevelsEnum } from '../utilerias';

interface IResp<T> {
  estatus: number;
  detalles: string;
  resultado?: T;
}

export class FuncionesGenerales<T extends Document> {
  constructor(private model: Model<T>) {}

  async create(data: Partial<T>): Promise<IResp<T>> {
    const detServ: [string, SistemasEnum, number] = [this.model.modelName, SistemasEnum.DOCUMENT, iniciaTiempo()];
    try {
      const createdItem = new this.model(data);
      const resp = await createdItem.save();
      calculaTiempo(detServ, `Se ha ejecutado save ${JSON.stringify({ data })} Resultado ${JSON.stringify(resp)}`);
      return {
        estatus: 200,
        detalles: 'ok',
        resultado: createdItem._id
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar save ${JSON.stringify({ data, error: error.message })}`,
        LoggerLevelsEnum.ERROR
      );
      return { estatus: 500, detalles: `Error al ejecutar save ${error.message}` };
    }
  }

  async insertMany<T>(data: T[]): Promise<IResp<T>> {
    const detServ: [string, SistemasEnum, number] = [this.model.modelName, SistemasEnum.DOCUMENT, iniciaTiempo()];
    try {
      const resp = await this.model.insertMany(data);
      calculaTiempo(detServ, `Se ha ejecutado insertMany ${JSON.stringify(data)} Resultado ${JSON.stringify(resp)}`);
      return {
        estatus: 200,
        detalles: 'ok',
        resultado: resp as unknown as T
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar insertMany ${JSON.stringify({ data, error: error.message })}`,
        LoggerLevelsEnum.ERROR
      );
      return { estatus: 500, detalles: `Error al ejecutar insertMany ${error.message}` };
    }
  }

  async find<resp = T>(filters: FilterQuery<T> = {}): Promise<IResp<resp>> {
    // const startTime = performance.now();
    const detServ: [string, SistemasEnum, number] = [this.model.modelName, SistemasEnum.DOCUMENT, iniciaTiempo()];
    try {
      const resp = await this.model.find(filters);
      calculaTiempo(detServ, `Se ha ejecutado find ${JSON.stringify(filters)} Resultado ${JSON.stringify(resp)}`);
      return {
        estatus: resp.length > 0 ? 200 : 404,
        detalles: resp.length > 0 ? 'ok' : EMensajesError.NOT_FOUND,
        resultado: resp as unknown as resp
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar find ${JSON.stringify({ filters, error: error.message })}`,
        LoggerLevelsEnum.ERROR
      );
      return { estatus: 500, detalles: `Error al ejecutar find ${error.message}` };
    }
  }

  async updateMany(
    filter?: FilterQuery<T>,
    update?: UpdateWithAggregationPipeline | UpdateQuery<T>
  ): Promise<IResp<T>> {
    const detServ: [string, SistemasEnum, number] = [this.model.modelName, SistemasEnum.DOCUMENT, iniciaTiempo()];
    try {
      const resp = await this.model.updateMany(filter, update);
      calculaTiempo(
        detServ,
        `Se ha ejecutado updateMany ${JSON.stringify({ filter, update })} Resultado ${JSON.stringify(resp)}`
      );
      return {
        estatus: resp.acknowledged ? 200 : 400,
        detalles: resp.acknowledged
          ? 'Actualizacion exitosa'
          : `Problemas al ejecutar updateMany ${JSON.stringify(resp)}`
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar updateMany ${JSON.stringify({ filter, update, error: error.message })}`,
        LoggerLevelsEnum.ERROR
      );
      return { estatus: 500, detalles: `Problemas al ejecutar updateMany ${error.message}` };
    }
  }

  async findById<T>(id: string): Promise<IResp<T>> {
    if (!Types.ObjectId.isValid(id)) {
      return { estatus: 400, detalles: `Parametro en findById no es válido: ${id}` };
    }
    const detServ: [string, SistemasEnum, number] = [this.model.modelName, SistemasEnum.DOCUMENT, iniciaTiempo()];
    try {
      const resp = await this.model.findById(new Types.ObjectId(id));
      calculaTiempo(detServ, `Se ha ejecutado findById ${id} Resultado ${JSON.stringify(resp)}`);
      return {
        detalles: 'ok',
        estatus: resp ? 200 : 404,
        resultado: (resp as unknown as T) || undefined
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar findById ${JSON.stringify({ id, error: error.message })}`,
        LoggerLevelsEnum.ERROR
      );
      return { estatus: 500, detalles: `Problemas al ejecutar findById ${error.message}` };
    }
  }

  async findOneAndUpdate(
    filter: FilterQuery<T>,
    update: UpdateWithAggregationPipeline | UpdateQuery<T>,
    options: QueryOptions
  ): Promise<IResp<T>> {
    const detServ: [string, SistemasEnum, number] = [this.model.modelName, SistemasEnum.DOCUMENT, iniciaTiempo()];
    try {
      const resp = await this.model.findOneAndUpdate(filter, update, options);
      calculaTiempo(
        detServ,
        `Se ha ejecutado findOneAndUpdate ${JSON.stringify({ filter, update, options })} Resultado ${JSON.stringify(
          resp
        )}`
      );
      return {
        detalles: 'ok',
        estatus: resp ? 200 : 404
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar findById ${JSON.stringify({ filter, update, options })}`,
        LoggerLevelsEnum.ERROR
      );
      return { estatus: 500, detalles: `Problemas al ejecutar findOneAndUpdate ${error.message}` };
    }
  }

  async count<resp = T>(filters: FilterQuery<T> = {}): Promise<IResp<resp>> {
    // const startTime = performance.now();
    const detServ: [string, SistemasEnum, number] = [this.model.modelName, SistemasEnum.DOCUMENT, iniciaTiempo()];
    try {
      const resp = await this.model.find(filters).countDocuments();
      calculaTiempo(detServ, `Se ha ejecutado find ${JSON.stringify(filters)} Resultado ${JSON.stringify(resp)}`);
      return {
        estatus: 200,
        detalles: 'ok',
        resultado: resp as unknown as resp
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar find ${JSON.stringify({ filters, error: error.message })}`,
        LoggerLevelsEnum.ERROR
      );
      return { estatus: 500, detalles: `Error al ejecutar find ${error.message}` };
    }
  }
  /*
  async updateById(id: string, data: Partial<T>): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn('updateById: ID inválido', { id });
      return null;
    }

    const startTime = performance.now();
    try {
      return await this.model.findByIdAndUpdate(new Types.ObjectId(id), data, { new: true });
    } catch (error) {
      this.logger.error('Error en updateById', { id, data, error });
      throw error;
    } finally {
      calculaTiempo(this.model.modelName, 'DOCUMENT', 'Actualización de documento');
      this.logger.info(`updateById ejecutado en ${performance.now() - startTime}ms`);
    }
  }

  async deleteById(id: string): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn('deleteById: ID inválido', { id });
      return null;
    }

    const startTime = performance.now();
    try {
      return await this.model.findByIdAndDelete(new Types.ObjectId(id));
    } catch (error) {
      this.logger.error('Error en deleteById', { id, error });
      throw error;
    } finally {
      calculaTiempo(this.model.modelName, 'DOCUMENT', 'Eliminación de documento');
      this.logger.info(`deleteById ejecutado en ${performance.now() - startTime}ms`);
    }
  } */
}

export * from ".";