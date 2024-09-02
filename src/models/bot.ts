import { platforms } from "@/utils/constants";
import mn, {
    HydratedDocument,
    HydratedDocumentFromSchema,
    InferSchemaType,
    Schema,
    Types,
} from "mongoose";

const TriArbitOrder = {
    a: { type: Schema.ObjectId, required: true, ref: "Order" },
    b: { type: Schema.ObjectId, required: true, ref: "Order" },
    c: { type: Schema.ObjectId, required: true, ref: "Order" },
    _id: false,
};

const ArbitSettings = {
    flipped: Boolean,
    use_ws: {type: Boolean, default: false},
    min_perc: { type: Number, default: 1 },
    _type: {
        type: String,
        enum: ["tri", "cross"],
        default: "tri",
    },
    _id: false,
};

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
        parent: { type: Schema.ObjectId, ref: "Bot" },
        orders: { type: [Schema.ObjectId], ref: "Order" },
        arbit_orders: { type: [TriArbitOrder] },
        aside: {
            type: [
                {
                    base: String,
                    ccy: String,
                    amt: { type: Number, default: 0, _id: false },
                },
            ],
            default: [],
        },
        total_base: {
            type: [
                {
                    base: String,
                    ccy: String,
                    amt: { type: Number, default: 0, _id: false },
                },
            ],
            default: [],
        },
        total_quote: {
            type: [
                {
                    base: String,
                    ccy: String,
                    amt: { type: Number, default: 0, _id: false },
                },
            ],
            default: [],
        },
        start_amt: { type: Number, default: 10 },
        start_bal: { type: Number, default: 10 },
        curr_amt: { type: Number, default: 0 },
        platform: { type: String, default: "bybit" },
        order_type: {
            type: String,
            enum: ["Market", "Limit"],
            default: "Market",
        },
        activated_at: { type: String },
        deactivated_at: { type: String },
        type: {
            type: String,
            enum: ["normal", "arbitrage"],
            default: "normal",
        },
        A: { type: String, default: "USDT" },
        B: { type: String, default: "BTC" },
        C: { type: String, default: "DOGE" },
        is_child: { type: Boolean, default: false },
        children: { type: [Schema.ObjectId], ref: "Bot" },
        arbit_settings: ArbitSettings,
    },
    { timestamps: true }
);

export interface IBot extends HydratedDocumentFromSchema<typeof BotSchema> {}
