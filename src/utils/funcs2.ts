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

const tuMacd = (df: IObj[]) => {
    const def = false;
    const faster = false;
    const fast = def ? 12 : faster ? 1 : 12/* 5 */,
        slow = def ? 26 : faster ? 2 : 26/* 12 */,
        signal = def ? 9 : faster ? 2 : 9/* 5 */;

    const prices = df.map((el) => el[useHaClose ? "ha_c" : "c"]);

    const _macd = macd(prices, { slow, signal, fast });
    const histogram: number[] = [];
    for (let i = 0; i < _macd.macdLine.length; i++)
        histogram.push(_macd.macdLine[i] - _macd.signalLine[i]);
    return { ..._macd, histogram };
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
    const mult = 1.8,
        atrLen = 1;
    const highs = df.map((e) => e[useHaClose ? "ha_h" : "c"]);
    const lows = df.map((e) => e[useHaClose ? "ha_l" : "c"]);
    const closings = df.map((e) => e[useHaClose ? "ha_c" : "c"]);

    console.log("BEGIN CE...");

    const ATR = atr(highs, lows, closings, { period: atrLen });
    const _atr = ATR.atrLine;
    const rsiLen = 2,
        fastLen = 15 /* 15 */,
        slowLen = 20; /* 50 */

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
