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


export const DepInfoSchema = new Schema({
    coin: {type: String, required: true},
    user: {type: Schema.ObjectId, required: true, ref: "User"},
    plat: {type: String, enum: platList, required: true},
    addr: {type: String, required: true},
    chain: {type: String, required: true},
    memo: {type: String, required: false}
}, {timestamps: true, versionKey: false})

export interface IDepInfo extends HydratedDocumentFromSchema<typeof DepInfoSchema> {}
