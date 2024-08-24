"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAmtToBuyWith = exports.getBaseToSell = exports.orderHasPos = exports.getBotStrategy = exports.getBotPlat = exports.getLastOrder = exports.findBotOrders = exports.parseFilledOrder = exports.getInterval = exports.calcTP = exports.calcSL = exports.calcEntryPrice = exports.tuCE = exports.heikinAshi = exports.parseKlines = exports.tuPath = exports.getExactDate = exports.parseDate = void 0;
const indicatorts_1 = require("indicatorts");
const path_1 = __importDefault(require("path"));
const constants_1 = require("./constants");
const models_1 = require("@/models");
const consts2_1 = require("./consts2");
const strategies_1 = require("@/strategies");
const ddNum = (e) => {
    e = `${e}`.trim();
    return e.length == 1 ? `0${e}` : e;
};
const toISOString = (date) => {
    let dateArr = date.split(",");
    let time = dateArr[1];
    time = time
        .split(":")
        .map((el) => ddNum(el))
        .join(":");
    dateArr = dateArr[0].split("/");
    date = `${dateArr[0]}-${ddNum(dateArr[1])}-${ddNum(dateArr[2])}`;
    return `${date} ${time}+02:00`;
};
const parseDate = (date) => toISOString(new Date(date).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
}));
exports.parseDate = parseDate;
const getExactDate = (interval) => {
    // Validate the interval
    if (interval <= 0) {
        throw new Error("Interval must be a positive number");
    }
    // Get the current date and time
    const now = new Date();
    // Calculate the number of milliseconds in the interval
    const intervalMs = interval * 60 * 1000;
    // Get the current time in milliseconds
    const nowMs = now.getTime();
    // Round down to the nearest interval
    const roundedMs = Math.floor(nowMs / intervalMs) * intervalMs;
    // Create a new Date object for the rounded time
    const roundedDate = new Date(roundedMs);
    // Return the ISO string of the rounded date
    return roundedDate;
};
exports.getExactDate = getExactDate;
const tuMacd = (df) => {
    const def = false;
    const faster = true;
    const fast = def ? 12 : faster ? 1 : 26 /* 5 */, slow = def ? 26 : faster ? 2 : 90 /* 12 */, signal = def ? 9 : faster ? 2 : 26; /* 5 */
    const prices = df.map((el) => el[constants_1.useHaClose ? "ha_c" : "c"]);
    const _macd = (0, indicatorts_1.macd)(prices, { slow, signal, fast });
    const histogram = [];
    for (let i = 0; i < _macd.macdLine.length; i++)
        histogram.push(_macd.macdLine[i] - _macd.signalLine[i]);
    return { ..._macd, histogram };
};
const tuPath = (pth) => path_1.default.resolve(...pth.split("/"));
exports.tuPath = tuPath;
const parseKlines = (klines) => {
    try {
        console.log(exports.parseKlines, { len: klines.length });
        let invalid = false;
        let df = [];
        const ha_o = 0, ha_h = 0, ha_l = 0, ha_c = 0;
        const interval = Math.floor((Number(klines[1][0]) - Number(klines[0][0])) / 60000);
        console.log({ interval });
        for (let i = 0; i < klines.length; i++) {
            const k = klines[i];
            const [ts, o, h, l, c, v] = k.map((e) => Number(e));
            df.push({
                ts: (0, exports.parseDate)(new Date(ts)),
                o,
                h,
                l,
                c,
                v,
                ha_o,
                ha_h,
                ha_l,
                ha_c,
            });
            if (i > 0) {
                const prev = Number(klines[i - 1][0]), curr = Number(klines[i][0]);
                const _diff = Math.floor((Number(curr) - Number(prev)) / 60000);
                if (_diff !== interval) {
                    invalid = true;
                    console.log({
                        _diff,
                        i,
                        len: klines.length,
                        prev: (0, exports.parseDate)(new Date(prev)),
                        curr: (0, exports.parseDate)(new Date(curr)),
                    });
                    console.log("KLINE DATA INVALID");
                    return df;
                }
            }
        }
        console.log("\nKLINES OK\n");
        return df;
    }
    catch (e) {
        console.log(e);
        return [];
    }
};
exports.parseKlines = parseKlines;
const heikinAshi = (df) => {
    console.log("\nBEGIN HA\n");
    const ha = [];
    for (let i = 0; i < df.length; i++) {
        const prev = ha[i - 1] || df[i];
        const c = (df[i].o + df[i].h + df[i].l + df[i].c) / 4;
        const o = (prev.o + prev.c) / 2;
        const h = Math.max(df[i].h, o, c);
        const l = Math.min(df[i].l, o, c);
        const m = (df[i].h + df[i].l) / 2;
        ha.push({
            ts: df[i].ts,
            o: Number(o),
            h: Number(h),
            l: Number(l),
            c: Number(c),
            v: df[i].v,
        });
    }
    console.log("HA DONE");
    return df.map((el, i) => ({
        ...el,
        ha_o: ha[i].o,
        ha_h: ha[i].h,
        ha_l: ha[i].l,
        ha_c: ha[i].c,
    }));
};
exports.heikinAshi = heikinAshi;
const tuCE = (df) => {
    const mult = 1.8, atrLen = 1;
    const highs = df.map((e) => e[constants_1.useHaClose ? "ha_h" : "c"]);
    const lows = df.map((e) => e[constants_1.useHaClose ? "ha_l" : "c"]);
    const closings = df.map((e) => e[constants_1.useHaClose ? "ha_c" : "c"]);
    console.log("BEGIN CE...");
    const ATR = (0, indicatorts_1.atr)(highs, lows, closings, { period: atrLen });
    const _atr = ATR.atrLine;
    const rsiLen = 2, fastLen = 1, //89 /* 15 */,
    slowLen = 2; //90; /* 50 */
    const sma20 = (0, indicatorts_1.ema)(closings, { period: fastLen });
    const sma50 = (0, indicatorts_1.ema)(closings, { period: slowLen });
    const _rsi = (0, indicatorts_1.rsi)(closings, { period: rsiLen });
    let sir = 1;
    const { histogram, macdLine, signalLine } = tuMacd(df);
    for (let i = 0; i < df.length; i++) {
        df[i].sma_20 = sma20[i];
        df[i].sma_50 = sma50[i];
        /* MACD */
        df[i].hist = histogram[i];
        df[i].macd = macdLine[i];
        df[i].signal = signalLine[i];
        /* END MACD */
        df[i]["rsi"] = _rsi[i];
        //continue
        const ceClosings = closings.slice(i - atrLen, i);
        const long_stop = Math.max(...ceClosings) - _atr[i] * mult;
        const short_stop = Math.max(...ceClosings) + _atr[i] * mult;
        df[i] = { ...df[i], long_stop, short_stop };
        const cdf = df[i], pdf = df[i - 1];
        if (i > 0) {
            const lsp = pdf.long_stop;
            const ssp = pdf.short_stop;
            if (pdf[constants_1.useHaClose ? "ha_c" : "c"] > lsp)
                df[i].long_stop = Math.max(cdf.long_stop, pdf.long_stop);
            if (pdf.ha_c < ssp)
                df[i].short_stop = Math.min(cdf.short_stop, pdf.short_stop);
            if (cdf[constants_1.useHaClose ? "ha_c" : "c"] > ssp)
                sir = 1;
            else if (cdf[constants_1.useHaClose ? "ha_c" : "c"] < lsp)
                sir = -1;
            df[i].sir = sir;
            df[i].buy_signal = Number(cdf.sir == 1 && pdf.sir == -1);
            df[i].sell_signal = Number(cdf.sir == -1 && pdf.sir == 1);
        }
    }
    console.log("CE DONE");
    return df.map((el) => el);
};
exports.tuCE = tuCE;
const calcEntryPrice = (row, side) => {
    const val = row.c;
    return val;
};
exports.calcEntryPrice = calcEntryPrice;
const calcSL = (entry) => {
    return entry * (1 - constants_1.SL / 100);
};
exports.calcSL = calcSL;
const calcTP = (entry) => entry * (1 + constants_1.TP / 100);
exports.calcTP = calcTP;
const getInterval = (m, plt) => {
    let interval = `${m}`;
    switch (plt) {
        case "okx":
            interval = m >= 60 ? `${Math.floor(m / 60)}H` : `${m}m`;
            break;
        case "gateio":
            interval = m >= 60 ? `${Math.floor(m / 60)}h` : `${m}m`;
            break;
        case "bitget":
            interval = m >= 60 ? `${Math.floor(m / 60)}h` : `${m}min`;
            break;
        case "mexc":
            interval = `${m}m`;
            break;
    }
    return interval;
};
exports.getInterval = getInterval;
const testMexcOrderRes = {
    symbol: "LTCBTC",
    orderId: 1,
    orderListId: -1,
    clientOrderId: "myOrder1",
    price: "0.1",
    origQty: "1.0",
    executedQty: "0.0",
    cummulativeQuoteQty: "0.0",
    status: "NEW",
    timeInForce: "GTC",
    type: "LIMIT",
    side: "BUY",
    stopPrice: "0.0",
    time: 1499827319559,
    updateTime: 1499827319559,
    isWorking: true,
    origQuoteOrderQty: "0.000000",
};
const parseFilledOrder = (res, plat) => {
    let data;
    if (plat == "okx") {
        res = res;
        data = {
            id: res.ordId,
            fillPx: Number(res.avgPx),
            fillSz: Number(res.accFillSz),
            fee: Number(res.fee),
            fillTime: Number(res.fillTime),
            cTime: Number(res.cTime),
        };
    }
    else if (plat == "bybit") {
        res = res;
        data = {
            id: res.orderId,
            fillPx: Number(res.avgPrice),
            fillSz: Number(res.cumExecQty),
            fee: Number(res.cumExecFee),
            fillTime: Number(res.updatedTime),
            cTime: Number(res.createTime),
        };
    }
    else if (plat == "bitget") {
        const feeDetail = JSON.parse(res.feeDetail);
        data = {
            id: res.orderId,
            fillPx: Number(res.priceAvg),
            fillSz: Number(res.baseVolume),
            fee: Number(feeDetail.newFees.t),
            fillTime: Number(res.uTime),
            cTime: Number(res.cTime),
        };
    }
    else if (plat == "mexc") {
        const _r = res;
        const fillPx = Number(_r.cummulativeQuoteQty) / Number(_r.executedQty);
        data = {
            id: `${_r.orderId}`,
            fillPx,
            fillSz: Number(_r.executedQty),
            fee: Number(0),
            fillTime: Number(_r.updateTime),
            cTime: Number(_r.time),
        };
    }
    else {
        // GATEIO
        const _res = res;
        data = {
            id: _res.id,
            fillPx: Number(_res.fillPrice),
            fillSz: Number(_res.filledTotal),
            fee: Number(_res.fee),
            fillTime: Number(_res.updateTimeMs),
            cTime: Number(_res.createTimeMs),
        };
    }
    return data;
};
exports.parseFilledOrder = parseFilledOrder;
const findBotOrders = async (bot) => {
    const orders = (await models_1.Order.find({
        bot: bot._id,
        base: bot.base,
        ccy: bot.ccy,
    }).exec()).filter((el) => bot.orders.includes(el._id));
    return orders;
};
exports.findBotOrders = findBotOrders;
const getLastOrder = async (bot) => {
    return bot.orders.length
        ? await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec()
        : null;
};
exports.getLastOrder = getLastOrder;
const getBotPlat = (bot) => {
    return new consts2_1.objPlats[bot.platform](bot);
};
exports.getBotPlat = getBotPlat;
const getBotStrategy = (bot) => {
    return strategies_1.objStrategies[bot.strategy - 1];
};
exports.getBotStrategy = getBotStrategy;
const orderHasPos = (order) => {
    return order != null && order.side == "sell" && !order.is_closed;
};
exports.orderHasPos = orderHasPos;
const getBaseToSell = (order) => {
    return order.base_amt - order.buy_fee;
};
exports.getBaseToSell = getBaseToSell;
const getAmtToBuyWith = (bot, order) => {
    return order ? order.new_ccy_amt - Math.abs(order.sell_fee) : bot.start_bal;
};
exports.getAmtToBuyWith = getAmtToBuyWith;
