import {
  FilterQuery,
  Model,
  QueryOptions,
  Types,
  UpdateQuery,
  UpdateWithAggregationPipeline,
  UpdateWriteOpResult,
} from "mongoose";
import { SistemasEnum, EMensajesError } from "../enum";
import { iniciaTiempo, calculaTiempo, LoggerLevelsEnum } from "../utilerias";

interface IResp<T> {
  estatus: number;
  detalles: string;
  resultado?: T;
}

export class FuncionesGenerales<T extends Document> {
  constructor(private model: Model<T>) {}

  async create(data: Partial<T>): Promise<IResp<T>> {
    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];
    try {
      const createdItem = new this.model(data);
      const resp = await createdItem.save();
      calculaTiempo(
        detServ,
        `Se ha ejecutado save ${JSON.stringify({
          data,
        })} Resultado ${JSON.stringify(resp)}`
      );
      return {
        estatus: 200,
        detalles: "ok",
        resultado: resp as T, // Retornamos el objeto completo guardado, no solo el ID
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar save ${JSON.stringify({
          data,
          error: error.message,
        })}`,
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Error al ejecutar save ${error.message}`,
      };
    }
  }

  async insertMany(data: any[]): Promise<IResp<T[]>> {
    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];
    try {
      const resp = await this.model.insertMany(data);
      calculaTiempo(
        detServ,
        `Se ha ejecutado insertMany ${JSON.stringify(
          data
        )} Resultado ${JSON.stringify(resp)}`
      );
      return {
        estatus: 200,
        detalles: "ok",
        resultado: resp as unknown as T[],
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar insertMany ${JSON.stringify({
          data,
          error: error.message,
        })}`,
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Error al ejecutar insertMany ${error.message}`,
      };
    }
  }

  async find(filters: FilterQuery<T> = {}): Promise<IResp<T[]>> {
    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];
    try {
      const resp = await this.model.find(filters);
      calculaTiempo(
        detServ,
        `Se ha ejecutado find ${JSON.stringify(
          filters
        )} Resultado ${JSON.stringify(resp)}`
      );
      return {
        estatus: resp.length > 0 ? 200 : 404,
        detalles: resp.length > 0 ? "ok" : EMensajesError.NOT_FOUND,
        resultado: resp as unknown as T[],
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar find ${JSON.stringify({
          filters,
          error: error.message,
        })}`,
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Error al ejecutar find ${error.message}`,
      };
    }
  }

  // Nota: Cambiado el retorno a UpdateWriteOpResult porque no devuelve el documento completo
  async updateMany(
    filter?: FilterQuery<T>,
    update?: UpdateWithAggregationPipeline | UpdateQuery<T>
  ): Promise<IResp<UpdateWriteOpResult>> {
    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];
    try {
      const resp = await this.model.updateMany(filter, update);
      calculaTiempo(
        detServ,
        `Se ha ejecutado updateMany ${JSON.stringify({
          filter,
          update,
        })} Resultado ${JSON.stringify(resp)}`
      );
      return {
        estatus: resp.acknowledged ? 200 : 400,
        detalles: resp.acknowledged
          ? "Actualizacion exitosa"
          : `Problemas al ejecutar updateMany ${JSON.stringify(resp)}`,
        resultado: resp,
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar updateMany ${JSON.stringify({
          filter,
          update,
          error: error.message,
        })}`,
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Problemas al ejecutar updateMany ${error.message}`,
      };
    }
  }

  async findById(id: string): Promise<IResp<T>> {
    if (!Types.ObjectId.isValid(id)) {
      return {
        estatus: 400,
        detalles: `Parametro en findById no es válido: ${id}`,
      };
    }
    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];
    try {
      const resp = await this.model.findById(new Types.ObjectId(id));
      calculaTiempo(
        detServ,
        `Se ha ejecutado findById ${id} Resultado ${JSON.stringify(resp)}`
      );
      return {
        detalles: "ok",
        estatus: resp ? 200 : 404,
        resultado: (resp as unknown as T) || undefined,
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar findById ${JSON.stringify({
          id,
          error: error.message,
        })}`,
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Problemas al ejecutar findById ${error.message}`,
      };
    }
  }

  async findOneAndUpdate(
    filter: FilterQuery<T>,
    update: UpdateWithAggregationPipeline | UpdateQuery<T>,
    options: QueryOptions
  ): Promise<IResp<T>> {
    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];
    try {
      const resp = await this.model.findOneAndUpdate(filter, update, options);
      calculaTiempo(
        detServ,
        `Se ha ejecutado findOneAndUpdate ${JSON.stringify({
          filter,
          update,
          options,
        })} Resultado ${JSON.stringify(resp)}`
      );
      return {
        detalles: "ok",
        estatus: resp ? 200 : 404,
        resultado: (resp as unknown as T) || undefined,
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar findOneAndUpdate ${JSON.stringify({
          filter,
          update,
          options,
        })}`, // Corregido el mensaje de log
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Problemas al ejecutar findOneAndUpdate ${error.message}`,
      };
    }
  }

  // Nota: Retorna un número (el conteo)
  async count(filters: FilterQuery<T> = {}): Promise<IResp<number>> {
    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];
    try {
      // Optimizamos quitando el .find() previo
      const resp = await this.model.countDocuments(filters);
      calculaTiempo(
        detServ,
        `Se ha ejecutado countDocuments ${JSON.stringify(
          filters
        )} Resultado ${resp}`
      );
      return {
        estatus: 200,
        detalles: "ok",
        resultado: resp,
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar countDocuments ${JSON.stringify({
          filters,
          error: error.message,
        })}`,
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Error al ejecutar countDocuments ${error.message}`,
      };
    }
  }

  async updateById(
    id: string,
    data: UpdateQuery<T> | Partial<T>
  ): Promise<IResp<T>> {
    if (!Types.ObjectId.isValid(id)) {
      return { estatus: 400, detalles: `updateById: ID inválido ${id}` };
    }

    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];

    try {
      // El { new: true } es vital para que retorne el documento YA actualizado, no el viejo
      const resp = await this.model.findByIdAndUpdate(
        new Types.ObjectId(id),
        data,
        { new: true }
      );

      calculaTiempo(
        detServ,
        `Se ha ejecutado updateById ${id} Resultado ${JSON.stringify(resp)}`
      );

      return {
        estatus: resp ? 200 : 404,
        detalles: resp ? "ok" : EMensajesError.NOT_FOUND,
        resultado: (resp as unknown as T) || undefined,
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar updateById ${JSON.stringify({
          id,
          data,
          error: error.message,
        })}`,
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Problemas al ejecutar updateById ${error.message}`,
      };
    }
  }

  async deleteById(id: string): Promise<IResp<T>> {
    if (!Types.ObjectId.isValid(id)) {
      return { estatus: 400, detalles: `deleteById: ID inválido ${id}` };
    }

    const detServ: [string, SistemasEnum, number] = [
      this.model.modelName,
      SistemasEnum.DOCUMENT,
      iniciaTiempo(),
    ];

    try {
      // findByIdAndDelete te devuelve el documento justo antes de ser eliminado
      const resp = await this.model.findByIdAndDelete(new Types.ObjectId(id));

      calculaTiempo(
        detServ,
        `Se ha ejecutado deleteById ${id} Resultado ${JSON.stringify(resp)}`
      );

      return {
        estatus: resp ? 200 : 404,
        detalles: resp
          ? "Documento eliminado correctamente"
          : EMensajesError.NOT_FOUND,
        resultado: (resp as unknown as T) || undefined,
      };
    } catch (error: any) {
      calculaTiempo(
        detServ,
        `Error al ejecutar deleteById ${JSON.stringify({
          id,
          error: error.message,
        })}`,
        LoggerLevelsEnum.ERROR
      );
      return {
        estatus: 500,
        detalles: `Problemas al ejecutar deleteById ${error.message}`,
      };
    }
  }
}
