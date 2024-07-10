import { Strategy } from "@/classes/strategy";
import { data } from "@/data/data";
import {
    MAKER_FEE_RATE,
    TAKER_FEE_RATE,
    cancelOnCond,
    isMarket,
    isStopOrder,
    slPercent,
    useHaClose,
} from "@/utils/constants";
import { calcEntryPrice, calcSL, calcTP } from "@/utils/funcs2";
import {
    getCoinPrecision,
    getPricePrecision,
    toFixed,
} from "@/utils/functions";
import { IObj } from "@/utils/interfaces";

export const strategy = ({
    df,
    balance,
    buyCond,
    sellCond,
    lev = 1,
    pair,
    maker = MAKER_FEE_RATE,
    taker = TAKER_FEE_RATE,
}: {
    df: IObj[];
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
        enterTs = "",
        profit: number = 0;

    const pricePrecision = getPricePrecision(pair, "bybit");
    const basePrecision = getCoinPrecision(pair, "sell", "bybit");
    balance = toFixed(balance, pricePrecision);
    df = df.slice(20);

    for (let i = 1; i < df.length; i++) {
        const prevRow = df[i - 1],
            row = df[i];
        console.log(`\n${prevRow.ts}\n`);

        if (entryLimit && !pos) {
            if (
                isMarket ||
                (prevRow.l <= entryLimit && entryLimit <= prevRow.h)
            ) {
                console.log(`\n${prevRow.ts} \t FILLING BUY ORDER\n`);
                entry = isMarket ? prevRow.o : entryLimit;
                base = (balance / entry) * (1 - taker);
                base = toFixed(base, basePrecision);

                mData["data"][prevRow["ts"]] = {
                    side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                    fill: entryLimit,
                    enterTs,
                    c: entry,
                    balance: `[${balance}] \t ${base} \t -${base * taker!}`,
                };
                pos = true;
            } else if (
                !cancelOnCond ? true : sellCond(prevRow, entryLimit, df, i - 1)
            ) {
                console.log(`${row.ts} \t CANCELLING BUY ORDER`);
                mData["data"][prevRow.ts] = {
                    side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                    c: entryLimit,
                    pricePrecision,
                    cancel: true,
                };
                entryLimit = null;
                pos = false;
            }
        } else if (exitLimit && pos) {
            const slCond =
                isStopOrder && (prevRow.l <= sl || prevRow.h >= exitLimit);
            const normalCond =
                !isStopOrder &&
                (isMarket ||
                    (prevRow.l <= exitLimit && exitLimit <= prevRow.h));
            if (slCond || normalCond) {
                console.log(
                    `\n${prevRow.ts} \t FILLING SELL ORDER: ${
                        slCond ? "STOP" : "NORMAL"
                    }\n`
                );
                exit = isMarket ? prevRow.o : exitLimit;
                if (slCond) {
                    exit = prevRow.l <= sl ? sl : exitLimit;
                    console.log(
                        `AT ${exit == sl ? "STOP LOSS" : "TAKE PROFIT"}\n`
                    );
                }

                balance = base * exit * (1 - maker);
                balance = toFixed(balance, pricePrecision);

                mData["data"][prevRow["ts"]] = {
                    side: `sell \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                    fill: exitLimit,
                    enterTs,
                    c: exit,
                    balance: `[${balance}] \t ${base}`,
                };
                /* Position now filled */
                entryLimit = null;
                base = 0;
                exitLimit = null;
                pos = false;

                if (exit > entry) gain += 1;
                else loss += 1;
                cnt += 1;
            } else if (!cancelOnCond || buyCond(prevRow, df, i - 1)) {
                if (isStopOrder) {
                    const delt = ((exitLimit - prevRow.c) / prevRow.c) * 100;
                    if (prevRow.c > entry) {
                        exitLimit = calcTP(prevRow, prevRow.c);
                        exitLimit = toFixed(exitLimit!, pricePrecision);

                        sl = calcSL(prevRow.c);
                        sl = toFixed(sl!, pricePrecision);
                        enterTs = row.ts;
                        console.log(
                            `[ ${row.ts} ] \t Limit sell order extended to ${exitLimit}`
                        );
                    }
                } else {
                    console.log(`${row.ts} \t CANCELLING SELL ORDER`);
                    mData["data"][prevRow.ts] = {
                        side: `sell \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                        c: exitLimit,
                        cancel: true,
                    };

                    exitLimit = null;
                }
            }
        }

        if (!entryLimit && buyCond(prevRow)) {
            /* Place buy order */
            entryLimit = prevRow[useHaClose ? "ha_c" : "c"] * (1 + 0.0 / 100);
            entryLimit = toFixed(entryLimit!, pricePrecision);
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit buy order at ${entryLimit}`);
        } else if (
            !exitLimit &&
            entryLimit &&
            pos &&
            (isStopOrder || sellCond(prevRow, entry))
        ) {
            exitLimit = calcTP(prevRow, entry);
            exitLimit = toFixed(exitLimit!, pricePrecision);

            sl = calcSL(entry);
            sl = toFixed(sl!, pricePrecision);
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
        }
    }

    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };
    return _data;
};
