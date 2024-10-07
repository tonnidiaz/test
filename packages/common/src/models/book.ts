import { platList } from "@cmn/utils/consts3";
import { Schema, type HydratedDocumentFromSchema } from "mongoose";
 const  TBook = {
    _id: false,
    px: Number,
    amt: Number,
}
const TOrderbook = {
    _id: false,
    ts: String,
    bids: [TBook],
    asks: [TBook],
}


export const TuBookSchema = new Schema({
    pair: {type: String, required: true},
    plat: {type: String, enum: platList, required: true},
    book: {type: [TOrderbook], default: []} 
}, {timestamps: true, versionKey: false})

export interface ITuBook extends HydratedDocumentFromSchema<typeof TuBookSchema> {}
