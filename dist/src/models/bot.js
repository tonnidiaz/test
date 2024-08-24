"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotSchema = void 0;
const mongoose_1 = require("mongoose");
exports.BotSchema = new mongoose_1.Schema({
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
    user: { type: mongoose_1.Schema.ObjectId, ref: "User" },
    orders: { type: [mongoose_1.Schema.ObjectId], ref: "Order" },
    aside: { type: [{ base: String, ccy: String, amt: { type: Number, default: 0, _id: false } }], default: [] },
    total_base: { type: [{ base: String, ccy: String, amt: { type: Number, default: 0, _id: false } }], default: [] },
    total_quote: { type: [{ base: String, ccy: String, amt: { type: Number, default: 0, _id: false } }], default: [] },
    start_amt: { type: Number, default: 10 },
    start_bal: { type: Number, default: 10 },
    curr_amt: { type: Number, default: 0 },
    platform: { type: String, default: 'bybit' },
    order_type: { type: String, enum: ['Market', 'Limit'], default: 'Market' }
}, { timestamps: true });
