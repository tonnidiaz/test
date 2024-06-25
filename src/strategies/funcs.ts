import { Strategy } from "@/classes/strategy";
import { data } from "@/data/data";
import {
    MAKER_FEE_RATE,
    TAKER_FEE_RATE,
    slPercent,
    P_DIFF,
    minDiff,
    isMarket,
    cancelOnCond,
} from "@/utils/constants";
import { calcEntryPrice } from "@/utils/funcs2";
import {
    getCoinPrecision,
    getPricePrecision,
    toFixed,
} from "@/utils/functions";
import { IObj } from "@/utils/interfaces";

let enterTs = "";
interface IBalProfitCalc {
    balance: number;
    base: number;
    exit: number;
    data: IObj;
    ccy: string;
    row: IObj;
    prevCandle: IObj;
    prevRow: IObj;
    maker: number;
    pricePrecision: number;
}
export const balProfitCalc: (props: IBalProfitCalc) => any[] = ({
    balance,
    base,
    exit,
    data,
    row,
    maker,
    pricePrecision,
    prevCandle,
    prevRow,
}) => {
    /**
     * We are selling
     * Returns balance, profit, data
     *  */
    console.log("LOG");
    console.log(base, exit);
    let newBalance = toFixed(base * exit, pricePrecision);
    //newBalance -= newBalance * maker;
    //newBalance = toFixed(newBalance, pricePrecision);
    const fee = newBalance * maker;
    let profit = newBalance - fee - balance;
    let profitPercentage = (profit / balance) * 100; //(exit - entry) / entry * 100
    profitPercentage = Number(profitPercentage.toFixed(4));
    balance = newBalance - fee; //+= profit;
    profit = toFixed(profit, pricePrecision);

    data["data"][row["ts"]] = {
        side: `sell \t {h:${prevCandle.h} -> ${prevRow.h}, l: ${prevCandle.l} -> ${prevRow.l}}`,
        enterTs,
        fill: exit,
        c: exit,
        balance: `${newBalance} \t -${fee}`,
        profit: `${profit}\t${profitPercentage}%`,
    };
    //for (let k of Object.keys(data.data))
    return [balance, profit, data];
};
export const strategy = ({
    df,
    candles,
    balance,
    buyCond,
    sellCond,
    lev = 1,
    pair,
    maker = MAKER_FEE_RATE,
    taker = TAKER_FEE_RATE,
}: {
    df: IObj[];
    candles: IObj[];
    balance: number;
    buyCond: (row: IObj, df?: IObj[], i?: number) => boolean;
    sellCond: (row: IObj, entry: number, df?: IObj[], i?: number) => boolean;
    pair: string[];
    maker: number;
    taker: number;
    lev?: number;
}) => {
    let pos = false;
    let cnt = 0,
        gain = 0,
        loss = 0;

    let mData: IObj = { data: {} },
        _data: IObj;
    console.log("CE_SMA: BEGIN BACKTESTING...\n");
    let entry: number = 0,
        entryLimit: number | null = null,
        exitLimit: number | null = null,
        base: number = 0,
        sl: number = 0,
        exit: number = 0,
        profit: number = 0;

    const pricePrecision = getPricePrecision(pair, "bybit");
    const basePrecision = getCoinPrecision(pair, "sell", "bybit");
    balance = toFixed(balance, pricePrecision);
    df = df.slice(20);
    candles = candles.slice(20);

    for (let i = 1; i < df.length; i++) {
        const prevRow = df[i - 1],
            prevCandle = candles[i - 1],
            row = candles[i];
        console.log(`\n${prevRow.ts}\n`);
        if (entryLimit && !pos) {
            console.log(
                `[${prevCandle.ts} \t H: ${prevCandle.h} \t E: ${entryLimit} \t L: ${prevCandle.l}\n]`
            );

            const cond = prevCandle.l <= entryLimit; // && entryLimit < prevCandle.h
            if (cond) {
                /* Fill buy order */
                entry = entryLimit;
                base = (balance / entry) * (1 - taker);
                base = toFixed(base, basePrecision);

                mData["data"][prevCandle["ts"]] = {
                    side: `buy \t {h:${prevCandle.h}, l: ${prevCandle.l}}`,
                    fill: entryLimit,
                    enterTs,
                    c: entry,
                    balance: `[${balance}] \t ${base} \t -${base * taker!}`,
                };

                pos = true;
            } else if (sellCond(prevRow, entry)){
                /* Cancel buy order If price goes down 2% */
                console.log(`${row.ts} \t CANCELLING BUY ORDER`);
                mData["data"][prevCandle.ts] = {
                    side: `buy \t {h:${prevCandle.h}, l: ${prevCandle.l}}`,
                    c: entryLimit,
                    pricePrecision,
                    cancel: true,
                };
                entryLimit = null;
            }
        } else if (exitLimit) {
            const cond =
                /* prevCandle.l < exitLimit && exitLimit < prevCandle.h || */ prevCandle.h >=
                exitLimit;
                const isLoss = prevCandle.l <= sl

            if (cond || isLoss) {
                /* Fill sell order */
                exit = isLoss && !cond ? sl : exitLimit;
                balance = base * exit * (1 - maker);
                balance = toFixed(balance, pricePrecision);

                mData["data"][prevCandle["ts"]] = {
                    side: `sell \t {h:${prevCandle.h}, l: ${prevCandle.l}}`,
                    fill: exitLimit,
                    enterTs,
                    c: exit,
                    balance: `[${balance}] \t ${base}`,
                };
                /* Position now filled */
                entryLimit = 0;
                base = 0;
                exitLimit = 0;
                pos = false;

                if (exit > entry) gain += 1;
                else loss += 1;
                cnt += 1;
            } else {
                console.log(`${row.ts} \t CANCELLING SELL ORDER`);
                mData["data"][prevCandle.ts] = {
                    side: `sell \t {h:${prevCandle.h}, l: ${prevCandle.l}}`,
                    c: exitLimit,
                    cancel: true,
                };

                exitLimit = null;
            }
        }

        if (!entryLimit && buyCond(prevRow)) {
            /* Place buy order */
            entryLimit = calcEntryPrice(prevCandle, "buy");
            entryLimit = toFixed(entryLimit ?? 0, pricePrecision);
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit buy order at ${entryLimit}`);
        } else if (
            !exitLimit &&
            entryLimit &&
            pos /* &&
            sellCond(prevRow, entry) */
        ) {
            /* Place sell order */
            exitLimit = entry * (1 + 5/100) //prevCandle.c * (1 + 3 / 100);
            exitLimit = toFixed(exitLimit, pricePrecision);
            sl = entry * (1 - .5/100) //prevCandle.c * (1 + 3 / 100);
            sl = toFixed(sl, pricePrecision);
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
        }
    }

    gain = Number((gain / cnt * 100).toFixed(2))
    loss = Number((loss / cnt * 100).toFixed(2))
    _data = { ...mData, balance, trades: cnt, gain, loss };
    return _data;
};
