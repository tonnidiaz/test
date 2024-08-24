"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderSchema = void 0;
const mongoose_1 = require("mongoose");
exports.OrderSchema = new mongoose_1.Schema({
    order_id: { type: String },
    cl_order_id: { type: String },
    buy_order_id: { type: String },
    side: { type: String, default: "buy" },
    buy_timestamp: { type: { _id: false, i: String, o: String } },
    sell_timestamp: { type: { _id: false, i: String, o: String } },
    highs: { type: [{ _id: false, ts: String, val: Number, tp: Number, px: Number }], default: [] },
    all_highs: { type: [{ _id: false, ts: String, val: Number, tp: Number, px: Number }], default: [] },
    base: { type: String, default: "" },
    ccy: { type: String, default: "" },
    buy_fee: { type: Number, default: 0 },
    sell_fee: { type: Number, default: 0 },
    sl: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    buy_price: { type: Number, default: 0 },
    tp: { type: Number, default: 0 },
    sell_price: { type: Number, default: 0 },
    _entry: { type: Number, default: 0 },
    _exit: { type: Number, default: 0 },
    ccy_amt: { type: Number, default: 0 }, //START BALANCE
    new_ccy_amt: { type: Number, default: 0 }, // BALANCE AFTER SELL, WITH FEES
    base_amt: { type: Number, default: 0 },
    is_closed: { type: Boolean, default: false },
    bot: { type: mongoose_1.Schema.ObjectId, required: true, ref: "Bot" }
}, { timestamps: true, versionKey: false });
//# sourceMappingURL=order.js.map