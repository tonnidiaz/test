import fs from "fs";
import { IObj } from "./interfaces";
const fp = "src/data/klines/binance/2021/DOGEUSDT_15m.json";
import { atr, ema, rsi, sma, bollingerBands } from "indicatorts";
import path from "path";
import { getPricePrecision, toFixed } from "./functions";
import { P_DIFF } from "./constants";

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
    const heikinAshiData: IObj[] = [];
    for (let i = 0; i < df.length; i++) {
        const prev: any = heikinAshiData[i - 1] || df[i];

        const c = (df[i].o + df[i].h + df[i].l + df[i].c) / 4;
        const o = (prev.o + prev.c) / 2;
        const h = Math.max(df[i].h, o, c);
        const l = Math.min(df[i].l, o, c);
        const m = (df[i].h + df[i].l) / 2;
        heikinAshiData.push({
            ts: df[i].ts,
            o: Number(o),
            h: Number(h),
            l: Number(l),
            c: Number(c),
            v: df[i].v,
        });
    }
    console.log("HA DONE");
    return heikinAshiData;
};

export const tuMacd = (df: IObj[]) => {
    const closings = df.map((el) => el.c);
    const fastLen = 2, //2,//5, //26
        slowLen = 58, //7//13,//100
        signalLen = 4; //6
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
        df[i].macd = hist;
    }
    return df;
};
//export const chandelierExit = (df: IObj[], mult = 1.8, atrLen = 1) => {
export const chandelierExit = (df: IObj[], mult = .2, atrLen = 1) => {
    const highs = df.map((e) => e.h);
    const lows = df.map((e) => e.l);
    const closings = df.map((e) => e.c);
    // Function to calculate Chandelier Exit
    console.log("BEGIN CE...");
    let ce: IObj[] = [];
    const ATR = atr(highs, lows, closings, { period: atrLen });
    const _atr = ATR.atrLine;
    const rsiLen = 10;

    const sma20 = ema(closings, { period: 1 });
    const sma50 = ema(closings, { period: 3}); /* TODO: 4 */
    const _rsi = rsi(closings, { period: rsiLen });
    let sir = 1;

    for (let i = 0; i < df.length; i++) {
        const long_stop =
            Math.max(...df.slice(i - atrLen, i).map((d) => d.c)) -
            _atr[i] * mult;
        const short_stop =
            Math.max(...df.slice(i - atrLen, i).map((d) => d.c)) +
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

            if (pdf.c > lsp)
                df[i].long_stop = Math.max(cdf.long_stop, pdf.long_stop);
            if (pdf.c < ssp)
                df[i].short_stop = Math.min(cdf.short_stop, pdf.short_stop);

            if (cdf.c > ssp) sir = 1;
            else if (cdf.c < lsp) sir = -1;

            df[i].sir = sir;
            df[i].buy_signal = Number(cdf.sir == 1 && pdf.sir == -1);
            df[i].sell_signal = Number(cdf.sir == -1 && pdf.sir == 1);
        }
    }

    df = tuMacd(df);
    console.log("CE DONE");
    return df.map((el) => el);
};

export const calcEntryPrice= (row:IObj, side: 'buy' | 'sell')=>{
    const p = .0/100
    const val = row.c * ( 1 + (side == 'buy' ? p : -p))
    return val
}