import { logTypes, platList } from "@cmn/utils/consts3";
import { Schema, type HydratedDocumentFromSchema } from "mongoose";



export const TuLogSchema = new Schema({
    app_name: {type: String, required: true},
    log: {type: String, required: true},
    ts: {type: String, required: true},
    type: {type: String, enum: logTypes, required: true},
}, {timestamps: true, versionKey: false})

export interface ITuLog extends HydratedDocumentFromSchema<typeof TuLogSchema> {}
