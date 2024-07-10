import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    TAKER_FEE_RATE,
    TP,
    cancelOnCond,
    isMarket,
    isStopOrder,
    slPercent,
    useHaClose,
    useSwindLow,
} from "@/utils/constants";
import { calcEntryPrice, calcSL, calcTP } from "@/utils/funcs2";
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
        skip = false,
        profit: number = 0;

    const pricePrecision = getPricePrecision(pair, "bybit");
    const basePrecision = getCoinPrecision(pair, "sell", "bybit");
    balance = toFixed(balance, pricePrecision);
    df = df.slice(20);

    for (let i = d + 1; i < df.length; i++) {
        const prevRow = df[i - 1],
            row = df[i];
        //let _bal = balance; // * (90/100)

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
            skip = true;
        };

        if (!pos && entryLimit) {
            if (prevRow.l <= entryLimit) {
                entry = toFixed(entryLimit, pricePrecision);
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
        const theRow = prevRow;
        if (pos && (sl || tp)) {
            console.log("HAS SL OR TP");
            if (sl && sl <= entry && theRow.l <= sl /*  && sl <= prevRow.h */) {
                /* FILL SL ORDER IF ANY */
                console.log("FILL @ SL");
                exit = toFixed(sl, pricePrecision);
                const ret = fillSellOrder({
                    exitLimit,
                    exit,
                    prevRow: theRow,
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
                exit = sl;
                _fillSellOrder(ret);
            } else if (tp && tp <= theRow.h) {
                /* FILL SL ORDER IF ANY */
                console.log("FILL @ TP");
                exit = toFixed(tp, pricePrecision);
                const ret = fillSellOrder({
                    exitLimit,
                    exit,
                    prevRow: theRow,
                    //bal,
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
                exit = tp;
                _fillSellOrder(ret);
            }
        }
        if (skip) {
            /* console.log(`\nSKIP: ${enterTs == prevRow.ts}`);
            if (1) {
                const isSl = exit == sl;
                console.log(`IS_SL: ${isSl}`);
                const filled = isSl ? row.l <= exit : exit <= row.h;
                console.log({ l: row.l, sl, exit, h: row.h });
                console.log(`[${prevRow.ts}]\tFILLED: ${filled}`);
                skip = !filled;
                pos = !filled
            }
            console.log("\n");
            if (skip) continue; */
        }
        if (!pos && buyCond(prevRow)) {
            /* PLACE MARKET BUY ORDER */
            entryLimit = isMarket ? row.o : prevRow.c;
            entryLimit = toFixed(entryLimit!, pricePrecision);
            //entry = entryLimit;
            enterTs = row.ts;

            if (isMarket) {
                console.log(`[ ${row.ts} ] Market buy order at ${entryLimit}`);
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
                /* if (row.l <= entryLimit) {
                    entry = entryLimit > row.h ? row.h : entryLimit;
                    //balance -= _bal;
                    const ret = fillBuyOrder({
                        entry,
                        prevRow,
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
                } */
            }
        } /* else if (pos && sellCond(prevRow, entry)) {
            //enterTs = row.ts
            //exitLimit = prevRow.sma_20
        } */
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
    return _data;
};
