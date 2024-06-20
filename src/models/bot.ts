import { platforms } from "@/utils/constants";
import mn, { HydratedDocument, HydratedDocumentFromSchema, InferSchemaType, Schema, Types } from "mongoose";

export const BotSchema = new Schema(
    {
        name: { type: String, required: true },
        desc: String,
        active: { type: Boolean, default: false },
        demo: { type: Boolean, default: true },
        base: { type: String, default: "ETH" },
        ccy: { type: String, default: "USDT" },
        category: { type: String, default: "spot" },
        interval: { type: Number, default: 15 },
        mult: { type: Number, default: 1.8 },
        ce_length: { type: Number, default: 1 },
        strategy: { type: Number, default: 5 },
        user: { type: Schema.ObjectId, ref: "User" },
        orders: { type: [Schema.ObjectId], ref: "Order" },
        start_amt: { type: Number, default: 10 },
        curr_amt: { type: Number, default: 0 },
        platform: { type: String, enum: ['bybit', 'okx'], default: 'bybit'},
        order_type: { type: String, enum: ['Market', 'Limit'], default: 'Market'}
    },
    { timestamps: true }
);



export interface IBot extends HydratedDocumentFromSchema<typeof BotSchema>{

}

