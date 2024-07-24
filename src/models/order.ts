import { HydratedDocumentFromSchema, InferSchemaType, Schema } from "mongoose";

interface IHigh {
    ts: string, val: number
}
export const OrderSchema = new Schema(
    {
        order_id: { type: String, default: "" },
        cl_order_id: { type: String, default: "" },
        buy_order_id: { type: String, default: "" },
        side: { type: String, default: "buy" },
        buy_timestamp: { type: Object},
        sell_timestamp: { type: Object},
        highs: { type: [{ts: String, val: Number}], default: []},
        all_highs: { type: [{ts: String, val: Number}], default: []},
        base: { type: String, default: "" },
        ccy: { type: String, default: "" },
        buy_fee: { type: Number, default: 0 },
        sell_fee: { type: Number, default: 0 },
        stop_price: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        buy_price: { type: Number, default: 0 },
        sell_price: { type: Number, default: 0 },
        ccy_amt: { type: Number, default: 0 },
        new_ccy_amt: { type: Number, default: 0 },
        base_amt: { type: Number, default: 0 },
        is_closed: { type: Boolean, default: false },
        bot: { type: Schema.ObjectId, required: true, ref: "Bot" },
    },
    { timestamps: true }
);
export interface IOrder extends HydratedDocumentFromSchema<typeof OrderSchema> {}
 