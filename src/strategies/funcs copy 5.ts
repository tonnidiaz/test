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
    prevCandle, prevRow
}) => {
    /**
     * We are selling
     * Returns balance, profit, data
     *  */
    console.log('LOG');
    console.log(base, exit);
    let newBalance = toFixed(base * exit, pricePrecision);
    //newBalance -= newBalance * maker;
    //newBalance = toFixed(newBalance, pricePrecision);
    const fee= newBalance * maker
    let profit = (newBalance - fee) - balance;
    let profitPercentage = (profit / balance) * 100; //(exit - entry) / entry * 100
    profitPercentage = Number(profitPercentage.toFixed(4));
    balance = newBalance - fee//+= profit;
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
    maker,
    taker,
}: {
    df: IObj[];
    candles: IObj[];
    balance: number;
    buyCond: (row: IObj, df?: IObj[], i?: number) => boolean;
    sellCond: (row: IObj, entry: number, df?: IObj[], i?: number) => boolean;
    pair: string[];
    maker?: number;
    taker?: number;
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
        exit: number = 0,
        profit: number = 0;

    const pricePrecision = getPricePrecision(pair, 'bybit');
    const basePrecision = getCoinPrecision(pair, "sell", 'bybit');
    console.log(`\n BASE PREC: ${basePrecision}`);
    balance = toFixed(balance, pricePrecision);
    console.log(df[0].ts);
    df = df.slice(20)
    candles = candles.slice(20)
    console.log(df[0].ts);
    console.log('\n');
    for (let i = 1; i < df.length; i++) {
        const row = df[i], candle = candles[i];
        const prevRow = df[i - 1], prevCandle = candles[i - 1];
        console.log(`\n[${i - 1}]\t[${prevCandle.ts}]  \t [${balance}\n`);
        const theCandle = prevCandle
        if (balance <= 4){
            continue
        }
        /* CHECK AND UPDATE OPEN POSITION FIRST */
        if (entryLimit) {
            // Fill buy pos
            /* TEST PREVIOUS CANDLE */
            console.log(
                `[${row.ts} \t H: ${prevCandle.h} \t E: ${entryLimit} \t L: ${prevCandle.l}\n]`
            );

            
            if (( theCandle.l <= entryLimit && entryLimit <= theCandle.h) || isMarket) {
                /* Fill buy order */
                
                entry = isMarket ? toFixed((theCandle.c + theCandle.o)/2, pricePrecision) : entryLimit;
                console.log(
                    `\nFILLING BUY ORDER at ${entryLimit} => ${entry}\n`
                );
                balance *= lev;
                
                base = toFixed(balance / entry, basePrecision); /* FIXED IT WHEN PLACING THE ORDER */
                balance = base * entry
                //base -= base * taker!;
                base = toFixed(base, basePrecision);
                
                mData["data"][prevCandle["ts"]] = {
                    side: `buy \t {h:${prevCandle.h} -> ${prevRow.h}, l: ${prevCandle.l} -> ${prevRow.l}}`,
                    fill: entryLimit,
                    enterTs,
                    c: entry,
                    balance: `[${balance}] \t ${base} \t -${base * taker!}`,
                };
                //entryLimit = null;
                pos = true;
                entryLimit = null;
            } else if (!cancelOnCond ? true : sellCond(prevRow, entryLimit, df, i - 1))  {
                console.log(`${row.ts} \t CANCELLING BUY ORDER`);
                mData["data"][prevCandle.ts] = {
                    side: `buy \t {h:${prevCandle.h} -> ${prevRow.h}, l: ${prevCandle.l} -> ${prevRow.l}}`,
                    c: entryLimit, pricePrecision,
                    cancel: true,
                };
                entryLimit = null;
                pos = false;
            }
        } else if (exitLimit) {
            
            if ((theCandle.l <= exitLimit && exitLimit <= theCandle.h ) || isMarket){// || prevCandle.l > exitLimit)   {
                /* Fill sell order */
                exit = isMarket ? toFixed((theCandle.c + theCandle.o)/2, pricePrecision) : exitLimit
                console.log("FILLING SELL ORDER");
                [balance, profit, _data] = balProfitCalc({
                    base: toFixed(base  * (1 - taker!), basePrecision),
                    balance,
                    exit,
                    data: mData,
                    row: theCandle, prevCandle, prevRow,
                    ccy: pair[1],
                    maker: maker!,
                    pricePrecision,
                });

                if (profit < 0) loss += 1;
                else gain += 1;

                mData = _data;
                pos = false;
                cnt += 1;
                exitLimit = null;
            } else if (!cancelOnCond ? true : buyCond(prevRow, df, i - 1)) {
                console.log(`${row.ts} \t CANCELLING SELL ORDER`);
                mData["data"][prevCandle.ts] = {
                    side: `sell \t {h:${prevCandle.h} -> ${prevRow.h}, l: ${prevCandle.l} -> ${prevRow.l}}`,
                    c: exitLimit,
                    cancel: true,
                };

                exitLimit = null;
            }
        }

        /* CHECK FOR SIGNALS */
        if (!pos && !entryLimit && buyCond(prevRow, df, i - 1)) {
            // Place limit buy order
            const val = calcEntryPrice(prevCandle, 'buy')
            entryLimit = toFixed(val, pricePrecision)
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit buy order at ${entryLimit}`);
        } else if (pos && !exitLimit && sellCond(prevRow, entry, df, i -1)) {
            // Place limit sell order
            const val = calcEntryPrice(prevCandle, 'sell')
            exitLimit = toFixed(val, pricePrecision)
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
        }
    }

    console.log(`TOTAL TRADES: ${cnt}`);

    cnt = cnt > 0 ? cnt : 1;
    gain = Number(((gain * 100) / cnt).toFixed(4));
    loss = Number(((loss * 100) / cnt).toFixed(4));
    mData = {
        ...mData,
        balance: toFixed(balance, pricePrecision),
        trades: cnt,
        gain: gain,
        loss: loss,
    };
    return mData;
};

