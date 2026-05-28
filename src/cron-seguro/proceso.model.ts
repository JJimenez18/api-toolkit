import mongoose, { Schema } from "mongoose";

const ProcesoControlSchema = new Schema({
    idProceso: { type: String, required: true, unique: true },
    estado: { type: String, enum: ['IDLE', 'BUSY'], default: 'IDLE' },
    inicio_ejecucion: { type: Date },
    fin_ejecucion: { type: Date },
    instancia_id: { type: String },
    ultimo_error: { type: String, default: null }
}, { timestamps: true });

export const ProcesoControl = mongoose.model('ProcesoControl', ProcesoControlSchema, 'control_procesos');