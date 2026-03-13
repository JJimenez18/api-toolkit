import { AsyncLocalStorage } from "async_hooks";
import mongooseInstance from "mongoose";
import expressInstance from "express";
import axios, { AxiosRequestConfig } from "axios";

//VariablesEntorno.getInstance().inicializar();

process.env.TZ = 'America/Mexico_City';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const asyncLocalStorage = new AsyncLocalStorage();

export const mongoose = mongooseInstance;
export const express = expressInstance;


export { Document, Schema, Model, Types, ConnectOptions, UpdateQuery, FilterQuery, UpdateWithAggregationPipeline, QueryOptions } from "mongoose";

export const ObjectId = mongoose.Types.ObjectId;
export const isValidObjectId = mongoose.isValidObjectId;

export { axios, AxiosRequestConfig };

export { Request, Response, NextFunction, Router } from "express";

export {

  query,
  body,
  param,
  ValidationChain,
  header,
  validationResult,
} from "express-validator";

export * from "./src/aws";
export * from "./src/middlewares";
export * from "./src/cifrado";
export * from "./src/enum";
export * from "./src/models";
export * from "./src/respuestas";
export * from "./src/rutas-monitoreo";
export * from "./src/utilerias";
export * from "./src/config-gral";
