import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";
import { v4 } from "uuid";

export const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

export class TraceId {
  static generarTraceId = (req: Request, res: Response, next: NextFunction): void => {
    const idRaw = req.headers["x-trace-id"]?.toString() || v4();
    const traceId = idRaw.replace(/-/g, "").trim();

    const store = new Map<string, string>();
    store.set("requestId", traceId);

    asyncLocalStorage.run(store, () => {
      res.setHeader("x-trace-id", traceId);
      next();
    });
  };

  static obtenerTraceId = (): string | undefined => {
    return asyncLocalStorage.getStore()?.get("requestId");
  };
}