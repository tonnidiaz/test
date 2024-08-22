import { IObj, IOrderDetails, ICandle } from "./interfaces";
import { atr, ema, rsi, macd } from "indicatorts";
import path from "path";
import { SL, TP, useHaClose } from "./constants";
import { OrderDetails } from "okx-api";
import { IBot } from "@/models/bot";
import { Order } from "@/models";
import { AccountOrderV5 } from "bybit-api";
import { IOrder } from "@/models/order";
import { objPlats } from "./consts2";
import { objStrategies } from "@/strategies";
import type { Order as GateOrder } from "gate-api";

const ddNum = (e: any) => {
    e = `${e}`.trim();
    return e.length == 1 ? `0${e}` : e;
};
const toISOString = (date: string) => {
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
export const parseDate = (date: Date | string | number) =>
    toISOString(
        new Date(date).toLocaleString("en-ZA", {
            timeZone: "Africa/Johannesburg",
        })
    );

export const getExactDate = (interval: number) => {
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
const tuMacd = (df: ICandle[]) => {
    const def = false;
    const faster = true;
    const fast = def ? 12 : faster ? 1 : 26 /* 5 */,
        slow = def ? 26 : faster ? 2 : 90 /* 12 */,
        signal = def ? 9 : faster ? 2 : 26; /* 5 */

    const prices = df.map((el) => el[useHaClose ? "ha_c" : "c"]);

    const _macd = macd(prices, { slow, signal, fast });
    const histogram: number[] = [];
    for (let i = 0; i < _macd.macdLine.length; i++)
        histogram.push(_macd.macdLine[i] - _macd.signalLine[i]);
    return { ..._macd, histogram };
};
export const tuPath = (pth: string) => path.resolve(...pth.split("/"));

export const parseKlines = (klines: (string | number)[][]) => {
    try {
        console.log(parseKlines, { len: klines.length });
        let invalid = false;
        let df: ICandle[] = [];
        const ha_o = 0,
            ha_h = 0,
            ha_l = 0,
            ha_c = 0;
        const interval = Math.floor(
            (Number(klines[1][0]) - Number(klines[0][0])) / 60000
        );
        console.log({ interval });

        for (let i = 0; i < klines.length; i++) {
            const k = klines[i];

            const [ts, o, h, l, c, v] = k.map((e) => Number(e));
            df.push({
                ts: parseDate(new Date(ts)),
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
                const prev = Number(klines[i - 1][0]),
                    curr = Number(klines[i][0]);
                const _diff = Math.floor((Number(curr) - Number(prev)) / 60000);

                if (_diff !== interval) {
                    invalid = true;
                    console.log({
                        _diff,
                        i,
                        len: klines.length,
                        prev: parseDate(new Date(prev)),
                        curr: parseDate(new Date(curr)),
                    });
                    console.log("KLINE DATA INVALID");
                    return df;
                }
            }
        }

        console.log("\nKLINES OK\n");

        return df;
    } catch (e) {
        console.log(e);
        return [];
    }
};

export const heikinAshi = (df: ICandle[]) => {
    console.log("\nBEGIN HA\n");
    const ha: IObj[] = [];
    for (let i = 0; i < df.length; i++) {
        const prev: any = ha[i - 1] || df[i];

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

export const tuCE = (df: ICandle[]) => {
    const mult = 1.8,
        atrLen = 1;
    const highs = df.map((e) => e[useHaClose ? "ha_h" : "c"]);
    const lows = df.map((e) => e[useHaClose ? "ha_l" : "c"]);
    const closings = df.map((e) => e[useHaClose ? "ha_c" : "c"]);

    console.log("BEGIN CE...");

    const ATR = atr(highs, lows, closings, { period: atrLen });
    const _atr = ATR.atrLine;
    const rsiLen = 2,
        fastLen = 1, //89 /* 15 */,
        slowLen = 2; //90; /* 50 */

    const sma20 = ema(closings, { period: fastLen });
    const sma50 = ema(closings, { period: slowLen });

    const _rsi = rsi(closings, { period: rsiLen });
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

        const cdf = df[i],
            pdf = df[i - 1];

        if (i > 0) {
            const lsp = pdf.long_stop;
            const ssp = pdf.short_stop;
            if (pdf[useHaClose ? "ha_c" : "c"] > lsp)
                df[i].long_stop = Math.max(cdf.long_stop, pdf.long_stop);
            if (pdf.ha_c < ssp)
                df[i].short_stop = Math.min(cdf.short_stop, pdf.short_stop);

            if (cdf[useHaClose ? "ha_c" : "c"] > ssp) sir = 1;
            else if (cdf[useHaClose ? "ha_c" : "c"] < lsp) sir = -1;

            df[i].sir = sir;
            df[i].buy_signal = Number(cdf.sir == 1 && pdf.sir == -1);
            df[i].sell_signal = Number(cdf.sir == -1 && pdf.sir == 1);
        }
    }

    console.log("CE DONE");
    return df.map((el) => el);
};

export const calcEntryPrice = (row: ICandle, side: "buy" | "sell") => {
    const val = row.c;
    return val;
};

export const calcSL = (entry: number) => {
    return entry * (1 - SL / 100);
};
export const calcTP = (entry: number) => entry * (1 + TP / 100);
export const getInterval = (m: number, plt: string) => {
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

    return interval as any;
};

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

type MexcOrder = typeof testMexcOrderRes;

export const parseFilledOrder = (res: IObj, plat: string) => {
    let data: IOrderDetails;

    if (plat == "okx") {
        res = res as OrderDetails;
        data = {
            id: res.ordId,
            fillPx: Number(res.avgPx),
            fillSz: Number(res.accFillSz),
            fee: Number(res.fee),
            fillTime: Number(res.fillTime),
            cTime: Number(res.cTime),
        };
    } else if (plat == "bybit") {
        res = res as AccountOrderV5;
        data = {
            id: res.orderId,
            fillPx: Number(res.avgPrice),
            fillSz: Number(res.cumExecQty),
            fee: Number(res.cumExecFee),
            fillTime: Number(res.updatedTime),
            cTime: Number(res.createTime),
        };
    } else if (plat == "bitget") {
        data = {
            id: res.orderId,
            fillPx: Number(res.priceAvg),
            fillSz: Number(res.baseVolume),
            fee: Number(res.feeDetail.newFees.t),
            fillTime: Number(res.uTime),
            cTime: Number(res.cTime),
        };
    } else if (plat == "mexc") {
        const _r = res as MexcOrder;
        const fillPx = Number(_r.cummulativeQuoteQty) / Number(_r.executedQty);
        data = {
            id: `${_r.orderId}`,
            fillPx,
            fillSz: Number(_r.executedQty),
            fee: Number(0),
            fillTime: Number(_r.updateTime),
            cTime: Number(_r.time),
        };
    } else {
        // GATEIO
        const _res = res as GateOrder;
        data = {
            id: _res.id!,
            fillPx: Number(_res.fillPrice!),
            fillSz: Number(_res.filledTotal),
            fee: Number(_res.fee),
            fillTime: Number(_res.updateTimeMs),
            cTime: Number(_res.createTimeMs),
        };
    }

    return data;
};

export const findBotOrders = async (bot: IBot) => {
    const orders = (
        await Order.find({
            bot: bot._id,
            base: bot.base,
            ccy: bot.ccy,
        }).exec()
    ).filter((el) => bot.orders.includes(el._id));
    return orders;
};

export const getLastOrder = async (bot: IBot) => {
    return bot.orders.length
        ? await Order.findById(bot.orders[bot.orders.length - 1]).exec()
        : null;
};

export const getBotPlat = (bot: IBot) => {
    return new objPlats[bot.platform](bot);
};
export const getBotStrategy = (bot: IBot) => {
    return objStrategies[bot.strategy - 1];
};

export const orderHasPos = (order?: IOrder | null) => {
    return order != null && order.side == "sell" && !order.is_closed;
};
export const getBaseToSell = (order: IOrder) => {
    return order.base_amt - order.buy_fee;
};
export const getAmtToBuyWith = (bot: IBot, order?: IOrder | null) => {
    return order ? order.new_ccy_amt - Math.abs(order.sell_fee) : bot.start_bal;
};
