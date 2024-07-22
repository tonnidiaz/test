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
    export const tuMacd = (df: IObj[]) => { 
        const closings = df.map((el) => el.c);
        const fastLen = 1,//2,//5, //26
            slowLen = 3,//7//13,//100
            signalLen =2//6
        const smaSrc: string = "ema";
        const smaSignal: string = "ema";
    
        const fastMa =
            smaSrc == "sma"
                ? sma(closings, { period: fastLen })
                : ema(closings, { period: fastLen });
        const slowMa =
            smaSrc == "sma"
                ? sma(closings, { period: slowLen })
                : ema(closings, { period: slowLen });
        const md = fastMa.map((e, i) => e - slowMa[i]);
        const signal =
            smaSignal == "sma"
                ? sma(md, { period: signalLen })
                : ema(md, { period: signalLen });
    
        for (let i = 0; i < df.length; i++) {
            const hist = md[i] - signal[i];
            df[i].macd = hist
        }
        return df
    };
export const tuPath = (pth: string) => path.resolve(...pth.split("/"));

export const parseKlines = (klines: [][]) => {
    let df: IObj[] = [];
    klines.forEach((k) => {
        const [ts, o, h, l, c, v] = k.map((e) => Number(e));
        df.push({ ts: parseDate(new Date(ts)), o, h, l, c, v });
    });
    return df;
};

export const heikinAshi = (df: IObj[]) => {
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
    })) as IObj[];
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
