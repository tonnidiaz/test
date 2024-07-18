import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    MAX_PEC_FROM_H,
    SL,
    SL2,
    TAKER_FEE_RATE,
    TP,
    checkGreen,
    isMarket,
    isStopOrder,
    noFees,
    rf,
    slFirstAlways,
    useSwindLow,
} from "@/utils/constants";
import { strategy as strWithTrades } from "./funcs-test copy 3";
import { strategy as strWithSellCond } from "./funcs-test copy 9 - sellcond";
import { strategy as strCopy6 } from "./funcs-test copy 6";
import { strategy as strWithGreenCheck } from "./funcs-test copy 5 - isGreen check";

import { parseDate } from "@/utils/funcs2";
import {
    getCoinPrecision,
    getPricePrecision,
    isBetween,
    randomNum,
    toFixed,
} from "@/utils/functions";
import { IObj } from "@/utils/interfaces";

let _cnt = 0;

const d = useSwindLow ? 20 : 0;
export const strategy = ({
    df,
    balance,
    buyCond,
    sellCond,
    lev = 1,
    pair,
    maker = MAKER_FEE_RATE,
    taker = TAKER_FEE_RATE,
    trades,
    platNm,
}: {
    df: IObj[];
    balance: number;
    buyCond: (row: IObj, df?: IObj[], i?: number) => boolean;
    sellCond: (row: IObj, entry: number, df?: IObj[], i?: number) => boolean;
    pair: string[];
    maker: number;
    taker: number;
    lev?: number;
    trades: IObj[];
    platNm: "binance" | "bybit" | "okx";
}) => {
    if (rf) {
        return strCopy6({
            df,
            balance,
            buyCond,
            sellCond,
            pair,
            maker,
            taker,
            trades,
            platNm,
        });
    }

    let pos = false;
    let cnt = 0,
        gain = 0,
        loss = 0,
        buyFees = 0,
        sellFees = 0;

    let mData: IObj = { data: [] },
        _data: IObj;
    console.log("CE_SMA: BEGIN BACKTESTING...\n");
    let entry: number = 0,
        entryLimit: number | null = null,
        exitLimit: number | null = null,
        tp: number | null = null,
        base: number = 0,
        sl: number | null = null,
        _sl: number | null = null,
        exit: number = 0,
        enterTs = "",
        exitTs = "",
        skip = false,
        l = 0,
        w = 0,
        c = 0,
        profit: number = 0;
    const pricePrecision = getPricePrecision(pair, platNm);
    const basePrecision = getCoinPrecision(pair, "limit", platNm);
    console.log({ pricePrecision, basePrecision });
    balance = toFixed(balance, pricePrecision);
    //df = df.slice(20);
    if (noFees) {
        /* maker = 0.08/100, taker = 0.01/100 */
    }
    console.log(trades);

    for (let i = d + 1; i < df.length; i++) {
        //if (balance < 10) continue;
        const prevRow = df[i - 1],
            row = df[i];
        const prePrevRow = i > 1 ? df[i - 2] : null;
        console.log(`\nTS: ${row.ts}`);
        _cnt += 1;

        const _fillSellOrder = (ret: ReturnType<typeof fillSellOrder>) => {
            (pos = ret.pos),
                (mData = ret.mData),
                (sl = ret.sl),
                (balance = ret.balance),
                (tp = ret.tp),
                (entryLimit = ret.entryLimit),
                (cnt = ret.cnt),
                (gain = ret.gain),
                (base = ret.base),
                (loss = ret.loss);
            sellFees += ret.fee;
            exitLimit = null;
            entryLimit = null;
            skip = true;
            _sl = null;
            // (_bal = ret._bal);
        };
        const _fillBuyOrder = (ret: ReturnType<typeof fillBuyOrder>) => {
            (pos = ret.pos),
                (base = ret.base),
                (mData = ret.mData),
                (balance = ret.balance),
                (_cnt = ret._cnt);
            enterTs = row.ts;
            //tp = toFixed(entry * (1 + TP / 100), pricePrecision);
            // sl = toFixed(entry * (1 - SL / 100), pricePrecision);
            buyFees += ret.fee;
            exitTs = row.ts;
        };
        const isGreen = prevRow.c >= prevRow.o;
        const isPreGreen = prePrevRow ? prePrevRow.c >= prePrevRow.o : false;

        async function _fillSell(_exit: number, _row: IObj, isSl?: boolean) {
            const ret = fillSellOrder({
                exitLimit,
                exit: _exit,
                prevRow: _row,
                entry: entry,
                base,
                balance,
                pricePrecision,
                enterTs,
                gain,
                loss,
                cnt,
                mData,
                pos,
                sl,
                tp,
                entryLimit,
                maker,
                isSl,
            });
            _fillSellOrder(ret);
        }

        if (!pos && entryLimit){
            entry = row.o
            const ret = fillBuyOrder({
                entry,
                prevRow: row,
                entryLimit,
                enterTs,
                taker,
                base,
                balance, //: _bal,
                basePrecision,
                mData: { ...mData },
                pos,
            });
            _fillBuyOrder(ret);
        }
        else if (pos && exitLimit) {
            const slRow = row;
            const exitRow = prevRow;
            console.log("HAS POS");
            const sl = exitLimit * (1 - SL2 / 100);

            let goOn = true,
                isSl = false;
            if (!_sl) {
                console.log("CHECKING EXIT");
            } else {
                console.log("NOT CHECKING EXIT");
            }
            if (exitLimit < slRow.h) {
                exit = exitLimit;
            } else {
            /*   else if (slRow.l < sl && sl < slRow.h) {
                isSl = true;
                exit = sl;
               
            } */
                goOn = false;
                console.log("NEITHER");
            }
            _sl = sl;
            if (goOn) {
                const _row = isSl ? slRow : exitRow;

                const p = isSl ? "SL" : "EXIT";
                console.log("\nFILLING SELL ORDER AT", p);
                console.log({ exit, l: _row.l, h: _row.h }, "\n");
                _fillSell(exit, exitRow, isSl);
            }
        }

        if (!pos 
            && buyCond(prevRow, df, i)
        ) {
            if (entryLimit) {
                console.log("BUY ORDER NOT FILLED, RE-CHECKING SIGNALS");
            }
            // Place limit buy order
            entryLimit = prevRow.ha_l
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(2)}`
            );
            if (entryLimit && isMarket) {
                entry = toFixed(row.o, pricePrecision);
                const ret = fillBuyOrder({
                    entry,
                    prevRow: row,
                    entryLimit,
                    enterTs,
                    taker,
                    base,
                    balance, //: _bal,
                    basePrecision,
                    mData: { ...mData },
                    pos,
                });
                _fillBuyOrder(ret);
            }
        } else if ( 
            pos
            //&& !isGreen
            && sellCond(prevRow, entry, df, i)
        ) {
            // Place limit sell order
            exitLimit = prevRow.ha_h// * (1 + 2 / 100); //Math.min(prevRow.ha_o, prevRow.ha_c)
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
        }

        if (pos && exitLimit) {
        }
    }

    const oKeys = Object.keys(mData.data);
    const lastPos = mData.data[oKeys[oKeys.length - 1]];
    if (lastPos && lastPos.side.startsWith("buy")) {
        console.log("ENDED WITH BUY");
        balance = lastPos.c * lastPos.base;
    }
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };
    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
