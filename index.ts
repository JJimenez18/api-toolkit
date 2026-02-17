import { AsyncLocalStorage } from "async_hooks";
import mongoose, { Document, Schema, Model, Types, ConnectOptions } from "mongoose";
import axios, { AxiosRequestConfig } from "axios";

//VariablesEntorno.getInstance().inicializar();

export const asyncLocalStorage = new AsyncLocalStorage();

export { mongoose };
export { Document, Schema, Model, Types, ConnectOptions };

export const ObjectId = mongoose.Types.ObjectId;
export const isValidObjectId = mongoose.isValidObjectId;

export { axios, AxiosRequestConfig };

export * from "./src/aws";
export * from "./src/middlewares";
export * from "./src/cifrado";
export * from "./src/enum";
export * from "./src/models";
export * from "./src/respuestas";
export * from "./src/rutas-monitoreo";
export * from "./src/utilerias";
export * from "./src/config-gral";