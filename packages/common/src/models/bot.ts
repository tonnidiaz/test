import { arbitTypes, platList } from "@cmn/utils/consts3";
import {
    type Document,
    InferSchemaType,
    Schema,
    Types,
} from "mongoose";

const TriArbitOrder = {
    a: { type: Schema.ObjectId, ref: "Order" },
    b: { type: Schema.ObjectId, ref: "Order" },
    c: { type: Schema.ObjectId, ref: "Order" },
    _id: false,
};

const ArbitSettings = {
    mega: {type: Boolean, default: false},
    /**
     * Listens to all pairs from specfied platform
     */
    super_mega: {type: Boolean, default: false},
    use_ws: {type: Boolean, default: false},
    min_perc: { type: Number, default: 1 },
    _type: {
        type: String,
        enum: arbitTypes,
        default: "tri",
    },
    _id: false,
};
export const TriArbitOrderSchema = new Schema({
    bot: {type: Schema.ObjectId, required: true, ref: "Bot"},
    A: {type: String},
    B: {type: String},
    C: {type: String},
    order: {type: TriArbitOrder}
},
{ timestamps: true })

const IChildPair = {_id: false, A: { type: String, default: "USDT" },
B: { type: String, default: "BTC" },
C: { type: String, default: "DOGE" },}

export const BotSchema = new Schema(
    {
        name: { type: String, required: true },
        desc: String,
        active: { type: Boolean, default: false },
        demo: { type: Boolean, default: true },
        base: {type: String, default: "SOL"},
        ccy: {type: String, default: "USDT"},
        balCcy: { type: String, default: "USDT" },
        category: { type: String, default: "spot" },
        interval: { type: Number, default: 15 },
        mult: { type: Number, default: 1.8 },
        ce_length: { type: Number, default: 1 },
        strategy: { type: Number, default: 5 },
        user: { type: Schema.ObjectId, ref: "User" },
        parent: { type: Schema.ObjectId, ref: "Bot" },
        /**Means bot is not paused by other bots */
        canTrade: {type: Boolean, default: true},
        //orders: { type: [Schema.ObjectId], ref: "Order" },
        //arbit_orders: { type: [Schema.ObjectId], ref: "TriArbitOrder", default: [] },
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
        balance: { type: Number, default: 0 },
        start_bal: { type: Number, default: 10 },
        curr_amt: { type: Number, default: 0 },
        platform: { type: String, default: "bybit", enum: platList },
        platB: { type: String, default: "okx", enum: platList },
        platA: { type: String, default: "kucoin", enum: platList },
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
        child_pairs: {type: [IChildPair], default: []},
        is_child: { type: Boolean, default: false },
        children: { type: [Schema.ObjectId], ref: "Bot" },
        arbit_settings: ArbitSettings,
    },
    { timestamps: true } 
);

export interface IBot extends Document, InferSchemaType<typeof BotSchema> {}
export interface ITriArbitOrder extends Document, InferSchemaType<typeof TriArbitOrderSchema> {}
