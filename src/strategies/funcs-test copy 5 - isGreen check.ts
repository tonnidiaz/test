import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    TAKER_FEE_RATE,
    TP,
    checkGreen,
    isMarket,
    noFees,
    slFirstAlways,
    useSwindLow,
} from "@/utils/constants";
import { strategy as strWithTrades } from "./funcs-test copy 3";
import { parseDate } from "@/utils/funcs2";
import {
    getCoinPrecision,
    getPricePrecision,
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
    if (trades.length)
        return strWithTrades({
            df,
            balance,
            buyCond,
            sellCond,
            lev,
            pair,
            maker,
            taker,
            trades,
            platNm,
        });
    

    let pos = false;
    let cnt = 0,
        gain = 0,
        loss = 0,
        buyFees = 0,
        sellFees = 0;

    let mData: IObj = { data: [] },
        _data: IObj;
    console.log("WITH GREEN: BEGIN BACKTESTING...\n");
    let entry: number = 0,
        entryLimit: number | null = null,
        tp: number | null = null,
        base: number = 0,
        sl: number | null = null,
        exit: number = 0,
        enterTs = "",
        skip = false,
        l = 0,
        w = 0,
        c = 0,
        profit: number = 0;
    maker = 0.001 / 100;
    taker = 0.001 / 100;
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
        };
        const isGreen = prevRow.c >= prevRow.o;
        if (pos) {
            //console.log("HAS SL OR TP");
            //console.log({c: prevRow.c, o: prevRow.o, h: prevRow.h, l: prevRow.l, tp, sl, isGreen} )
            const tpCond = tp && row.o > entry && !isGreen
            const slCond = sl && sl <= entry && prevRow.l <= sl && isGreen
            if (slFirstAlways || isGreen /* SL FIRST */) {
                if (pos && slCond) {
                    exit = row.o;
                    exit = toFixed(exit, pricePrecision);
                    const ret = fillSellOrder({
                        exitLimit: tp,
                        exit,
                        prevRow: row,
                        entry,
                        base,
                        balance,
                        pricePrecision,
                        enterTs,
                        gain,
                        maker,
                        loss,
                        cnt,
                        mData,
                        pos,
                        sl,
                        tp,
                        entryLimit,
                        isSl: true,
                    });
                    w = 0;
                    l += 1;
                    _fillSellOrder(ret);
                }
                if (pos && tpCond) {
                    /* FILL TP ORDER IF ANY */
                    console.log("FILL @ TP");
                    exit = row.o;
                    exit = toFixed(exit, pricePrecision);
                    const ret = fillSellOrder({
                        exitLimit: sl,
                        exit,
                        maker,
                        prevRow,
                        entry,
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
                    });
                    l = 0;
                    w += 1;
                    _fillSellOrder(ret);
                }
            } else {
                if (
                    pos && tpCond/* && prevRow.c >= prevRow.o */
                ) {
                    /* FILL TP ORDER IF ANY */
                    console.log("FILL @ TP");
                    exit = row.o;
                    exit = toFixed(exit, pricePrecision);
                    const ret = fillSellOrder({
                        exitLimit: sl,
                        exit,
                        maker,
                        prevRow,
                        entry,
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
                    });
                    l = 0;
                    w += 1;
                    _fillSellOrder(ret);
                }
                if (pos &&slCond) {
                    exit = row.o;
                    exit = toFixed(exit, pricePrecision);
                    exit = toFixed(exit, pricePrecision);
                    const ret = fillSellOrder({
                        exitLimit: tp,
                        exit,
                        prevRow: row,
                        entry,
                        base,
                        balance,
                        pricePrecision,
                        enterTs,
                        gain,
                        maker,
                        loss,
                        cnt,
                        mData,
                        pos,
                        sl,
                        tp,
                        entryLimit,
                        isSl: true,
                    });
                    w = 0;
                    l += 1;
                    _fillSellOrder(ret);
                }
            }
        }
        if (!pos && skip) {
            skip = false;
            //continue
        }
        //console.log(`\nLOSS" ${l}\n`);
        if (!pos && buyCond(prevRow)) {
            /* PLACE MARKET BUY ORDER */
            entryLimit = isMarket ? row.o : prevRow.ha_c;
            entryLimit = toFixed(entryLimit!, pricePrecision);
            enterTs = row.ts;

            if (isMarket) {
                //console.log(`[ ${row.ts} ] Market buy order at ${entryLimit}`);
                entry = entryLimit;
                //balance -= _bal;
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
            } else {
                console.log(`[ ${row.ts} ] Limit buy order at ${entryLimit}`);
            }
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