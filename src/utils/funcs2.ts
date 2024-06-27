import fs from "fs";
import { IObj } from "./interfaces";
const fp = "src/data/klines/binance/2021/DOGEUSDT_15m.json";
import { atr, ema, rsi, sma, bollingerBands } from "indicatorts";
import path from "path";
import { getPricePrecision, toFixed } from "./functions";
import { P_DIFF, isStopOrder, useHaClose } from "./constants";

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
    date = `${dateArr[2]}-${ddNum(dateArr[0])}-${ddNum(dateArr[1])}`;
    return `${date} ${time} GMT+2`;
};
export const parseDate = (date: Date | string) =>
    toISOString(
        new Date(date).toLocaleString("en-US", {
            timeZone: "Africa/Johannesburg",
        })
    ); /* .replaceAll("/", "-").replaceAll(",", ""); */

export const tuPath = (pth: string) => path.resolve(...pth.split("/"));
export const parseKlines = (klines: [][]) => {
    let df: IObj[] = [];
    klines.forEach((k) => {
        const [ts, o, h, l, c, v] = k.map((e) => Number(e));
        df.push({ ts: parseDate(new Date(ts)), o, h, l, c, v });
    });
    return df;
};

export const heikinAshi = (df: IObj[], pair: string[]) => {
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

export const tuMacd = (df: IObj[]) => {
    const closings = df.map((el) => el[useHaClose ? 'ha_c' : 'c']);
    const fastLen = 1,//12,//10, //2,//5, //26
        slowLen = 2,//26,//58, //7//13,//100
        signalLen = 2//9//8; //6
    const smaSrc: string = "sma";
    const smaSignal: string = "sma";

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
        df[i].macd = hist;
    }
    return df;
};
//export const chandelierExit = (df: IObj[], mult = 1.8, atrLen = 1) => {
export const chandelierExit = (df: IObj[]) => {

    const mult = 1.4 , atrLen = 1
    const highs = df.map((e) => e[ useHaClose ? 'ha_h' : 'c']);
    const lows = df.map((e) => e[ useHaClose ? 'ha_l' : 'c']);
    const closings = df.map((e) => e[ useHaClose ? 'ha_c' : 'c']);
    // Function to calculate Chandelier Exit
    console.log("BEGIN CE...");

    const ATR = atr(highs, lows, closings, { period: atrLen });
    const _atr = ATR.atrLine;
    const rsiLen = 1,
        fastLen = 15 /* 15 */, slowLen = 50/* 50 */;

    const sma20 = ema(closings, { period: fastLen });
    const sma50 = ema(closings, { period: slowLen }); /* TODO: 4 */
    const _rsi = rsi(closings, { period: rsiLen });
    let sir = 1;

    for (let i = 0; i < df.length; i++) {
        const ceClosings = closings.slice(i - atrLen, i)
        const long_stop =
            Math.max(...ceClosings) -
            _atr[i] * mult;
        const short_stop =
            Math.max(...ceClosings) +
            _atr[i] * mult;
        df[i] = { ...df[i], long_stop, short_stop };

        const cdf = df[i],
            pdf = df[i - 1];
        df[i].sma_20 = sma20[i];
        df[i].sma_50 = sma50[i];
        df[i]["rsi"] = _rsi[i];
        if (i > 0) {
            const lsp = pdf.long_stop;
            const ssp = pdf.short_stop;

            if (pdf[ useHaClose ? 'ha_c' : 'c'] > lsp)
                df[i].long_stop = Math.max(cdf.long_stop, pdf.long_stop);
            if (pdf.ha_c < ssp)
                df[i].short_stop = Math.min(cdf.short_stop, pdf.short_stop);

            if (cdf[ useHaClose ? 'ha_c' : 'c'] > ssp) sir = 1;
            else if (cdf[ useHaClose ? 'ha_c' : 'c'] < lsp) sir = -1;

            df[i].sir = sir;
            df[i].buy_signal = Number(cdf.sir == 1 && pdf.sir == -1);
            df[i].sell_signal = Number(cdf.sir == -1 && pdf.sir == 1);
        }
    }

    df = tuMacd(df);
    console.log("CE DONE");
    return df.map((el) => el);
};

export const calcEntryPrice = (row: IObj, side: "buy" | "sell") => {
    const val = row.c
    return val;
};

export const calcSL = ( entry: number)=>entry * (1 - .1 / 100);
export const calcTP = ( row: any, entry: number)=>isStopOrder ? entry * (1 + 3.5/100)  : row[useHaClose ? 'ha_c' : 'c'] * (1 - 0.0 / 100);
export const getInterval = (m: number, plt: 'bybit' |'okx' | 'binance')=>{
    return plt == 'okx' ? (m >= 60 ? `${Math.floor(m / 60)}H` : `${m}m`) : `${m}m`
}