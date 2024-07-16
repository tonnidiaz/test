import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    SL2,
    TAKER_FEE_RATE,
    TP,
    checkGreen,
    isMarket,
    isStopOrder,
    noFees,
    slFirstAlways,
    useSwindLow,
} from "@/utils/constants";
import { strategy as strWithTrades } from "./funcs-test copy 3";
import { strategy as strWithSellCond } from "./funcs-test copy 9 - sellcond";
import { strategy as strWithGreenCheck } from "./funcs-test copy 5 - isGreen check";

import { parseDate } from "@/utils/funcs2";
import {
    getCoinPrecision,
    getPricePrecision,
    isBetween,
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
            // (_bal = ret._bal);
        };
        const _fillBuyOrder = (ret: ReturnType<typeof fillBuyOrder>) => {
            (pos = ret.pos),
                (base = ret.base),
                (mData = ret.mData),
                (balance = ret.balance),
                (_cnt = ret._cnt);
            enterTs = row.ts;
            tp = toFixed(entry * (1 + TP / 100), pricePrecision);
            sl = toFixed(entry * (1 - SL / 100), pricePrecision);
            buyFees += ret.fee;
            exitTs = row.ts;
        };
        const isGreen = prevRow.c >= prevRow.o;
        const isPreGreen = prePrevRow ? prePrevRow.c >= prePrevRow.o : false;

        async function _fillSell(_exit: number, _row: IObj) {
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
            });
            _fillSellOrder(ret);
        }

        if (!pos && entryLimit) {
            let goOn = true,
                isSl = false;
            const _sl = entryLimit * (1 + SL2 / 100);
            const isHitHa = isBetween(prevRow.ha_l, entryLimit, 0)
            const eFromL = Number(((prevRow.l - prevRow.ha_l)/prevRow.ha_l*100).toFixed(2))
            if (isHitHa)
                console.log({eFromL});
            if (isHitHa && eFromL < .5){
               entryLimit *= (1+eFromL/100)
            }
            if (isBetween(prevRow.l, entryLimit, 0) && isGreen){entry = row.o}
            else if (isBetween(prevRow.l, _sl, 0) && isGreen){entry = row.o;isSl = true}
            /* if (entryLimit && prevRow.l < entryLimit) {
                entry = row.o;
            } else if (prevRow.l <= sl) {
                entry = row.o;
            } */ else {
                goOn = false;
            }
            //goOn = true
            //entry = entryLimit
            if (goOn && entryLimit) {
                // entry = row.o
                console.log({
                    
                    entryLimit,
                    entry,
                    o: isSl ? row.o : prevRow.o,
                    h: prevRow.h,
                    l: prevRow.l,
                    c: prevRow.c,
                });
                console.log("FILLING BUY ORDER..", isSl ? "SL" : "ENTRY");

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
        }
        else if (pos && tp && sl && exitLimit) {
            console.log("HAS POS");
            let goOn = true,
                isSl = false;

            const isHaHit = exitLimit < prevRow.ha_h
            const eFromH = Number(((( exitLimit- prevRow.h) / prevRow.h) * 100).toFixed(2));
            if (isHaHit) console.log({eFromH});
            let _ex = 0
            if (isHaHit && eFromH < .5){
                exitLimit *= (1 - (eFromH + .1)/100)
                ///_ex = exitLimit * (1 - (eFromH + .1)/100)
            }
            //const ofe = exitLimit
            //    ? Number((((exitLimit - row.o) / row.o) * 100).toFixed(2))
            //    : 0;
            /* console.log({
                eFromH,
                o: row.o,
                e: exitLimit,
                isGreen,
                l: prevRow.l,
                h: prevRow.h,
            }); */
            const _sl = entry * (1 - SL2 / 100);
           
            if (exitLimit < prevRow.h) {
                exit = exitLimit// (exitLimit + prevRow.c) / 2
            } else if (isBetween(prevRow.ha_l, _sl, prevRow.ha_h) && isGreen) {
                exit = row.o; isSl=true
            } else {
            /*  if (
                exitLimit &&
                exitLimit < prevRow.h &&
                // && prevRow.l > exitLimit
                !isGreen &&
                ofe < 0.05
            ) {
                console.log({ ofe });
                exit = row.o;
            }
            else if (row.h >= exitLimit && !isGreen){
                exitLimit *= (1+ .5/100) 
                continue
            } else if (prevRow.h >= tp) {
                exit = row.o;
         } */
                goOn = false;
            }

            if (goOn) {
                //exit = row.o
                console.log({
                    entry,
                    exitLimit,
                    o: row.o,
                    h: prevRow.h,
                    l: row.l,
                    sl,
                    hit: !isSl || sl <= row.h,
                    c: row.c,
                });
                console.log("FILLING SELL ORDER..");
                _fillSell(exit, row);
                //if (isSl || true) continue;
            }
        }

        if (
            !pos &&
            buyCond(prevRow, df, i)
            //&& isGreen
            //&& prevRow.l < prevRow.o
        ) {
            // Place limit buy order
            entryLimit = prevRow.ha_c;
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
            pos &&
            !exitLimit &&
            sellCond(prevRow, entry, df, i)
            //&& !isGreen
            //&& prevRow.h > prevRow.o
        ) {
            // Place limit sell order
            exitLimit = prevRow.ha_c;
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit sell order at ${exitLimit?.toFixed(2)}`
            );
            //==_fillSell(row.o, row)
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
