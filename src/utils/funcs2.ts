import { IObj } from "./interfaces";
import { atr, ema, rsi, macd } from "indicatorts";
import path from "path";
import { SL, TP, useHaClose } from "./constants";
import { OrderDetails } from "okx-api";
import { IBot } from "@/models/bot";
import { Order } from "@/models";

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
export const parseDate = (date: Date | string) =>
    toISOString(
        new Date(date).toLocaleString("en-ZA", {
            timeZone: "Africa/Johannesburg",
        })
    );

export const tuPath = (pth: string) => path.resolve(...pth.split("/"));
export const parseKlines = (klines: [][]) => {
    const df: IObj[] = [];

    const ha: IObj[] = [];
    for (let i = 0; i < klines.length; i++) {
        const k = klines[i];
        const [ts, o, h, l, c, v] = k.map((e) => Number(e));
        let row = { ts: parseDate(new Date(ts)), o, h, l, c, v };
        df.push(row);
        /* HEIKIN-ASHI */
        const prev: any = ha[i - 1] || df[i];
        const ha_c = (row.o + row.h + row.l + row.c) / 4;
        const ha_o = ((prev.ha_o ?? prev.o) + (prev.ha_c ?? prev.c)) / 2;
        const ha_h = Math.max(row.h, ha_o, ha_c);
        const ha_l = Math.min(row.l, ha_o, ha_c);
        const _ha = { ha_o, ha_h, ha_l, ha_c };
        
        row = { ...row, ..._ha };
        ha.push(row);
        df[i] = row

        
    }

    const closings = df.map((e) => e[useHaClose ? "ha_c" : "c"]);

    console.log("BEGIN CE...");

    const fastLen = 1 /* 15 */,
        slowLen = 2// 2; /* 50 */

    const sma20 = ema(closings, { period: fastLen });
    const sma50 = ema(closings, { period: slowLen });

    const def = false;
    const faster = true;
    const fast = def ? 12 : faster ? 1 : 5,
        slow = def ? 26 : faster ? 2 : 12,
        signal = def ? 9 : faster ? 2 : 5;
    const _macd = macd(closings, { fast, slow, signal });
    const histogram: number[] = [];
    for (let i = 0; i < df.length; i++) {
        df[i].sma_20 = sma20[i];
        df[i].sma_50 = sma50[i];
        /* MACD */
        histogram.push(_macd.macdLine[i] - _macd.signalLine[i]);
        df[i].hist = Number(histogram[i].toFixed(2));
        df[i].macd = Number(_macd.macdLine[i].toFixed(2));
        df[i].signal = Number(_macd.signalLine[i].toFixed(2));
    }
    return df;
};

export const heikinAshi = (df: IObj[]) => {
    return df;
};



export const tuCE = (df: IObj[]) => {
    return df;

};

export const calcEntryPrice = (row: IObj, side: "buy" | "sell") => {
    const val = row.c;
    return val;
};

export const calcSL = (entry: number) => {
    return entry * (1 - SL / 100);
};
export const calcTP = (entry: number) => entry * (1 + TP / 100);
export const getInterval = (m: number, plt: "bybit" | "okx" | "binance") => {
    return plt == "okx"
        ? m >= 60
            ? `${Math.floor(m / 60)}H`
            : `${m}m`
        : `${m}m`;
};

export const parseFilledOrder = (finalRes: OrderDetails) => {
    return {
        id: finalRes.ordId,
        fillPx: Number(finalRes.avgPx),
        fillSz: Number(finalRes.accFillSz),
        fee: Number(finalRes.fee),
        fillTime: Number(finalRes.fillTime),
        cTime: Number(finalRes.cTime),
    };
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
