import { Schema, InferSchemaType, Document } from "mongoose";
import { IAddress } from "../utils/interfaces";

const BeeSchema = new Schema({
    name: {
        type: String, unique: true, required: true
    },
    interval: {type: Number, default: 2},
    active: {type: Boolean, default: false},
    stings: {type: [String], default: []}
}, {timestamps: true})

export interface IBee extends Document, InferSchemaType<typeof BeeSchema> {
}
export { BeeSchema}