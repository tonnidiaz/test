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
    trades,
    platNm
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
    platNm: 'binance' | 'bybit' | 'okx'
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
        profit: number = 0, _entry = 0, _exit = 0, buyFees = 0, sellFees = 0;

    const pricePrecision = getPricePrecision(pair, "bybit");
    const basePrecision = getCoinPrecision(pair, "limit", "bybit");
    balance = toFixed(balance, pricePrecision);
    df = df.slice(20);

    for (let i = d + 1; i < df.length; i++) {
        const prevRow = df[i - 1],
            row = df[i];
        //let _bal = balance; // * (90/100)

        console.log(`\nTS: ${row.ts}`);
        _cnt += 1;
        const theRow = prevRow;
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

            exitLimit = null;
            sellFees += ret.fee
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
           // pos = prevRow.ha_l <= entry && entry <= prevRow.ha_h;
            entryLimit = null;
            buyFees += ret.fee
            //skip = true;
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
            } else if (
                !cancelOnCond ||
                sellCond(prevRow, entryLimit, df, i - 1)
            ) {
                console.log(`${row.ts} \t CANCELLING BUY ORDER`);
                mData["data"].push({
                    side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                    c: entryLimit,
                    pricePrecision,
                    enterTs,
                    ts: prevRow.ts,
                    cancel: true,
                });
                entryLimit = null;
                pos = false;
            }
        } else if (pos && exitLimit) {
            console.log("HAS POS");
            if (exitLimit <= theRow.h) {
                exit = toFixed(exitLimit, pricePrecision);
                const ret = fillSellOrder({
                    exitLimit,
                    exit,
                    prevRow: theRow,
                    entry: _entry,
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
                    entryLimit,maker
                });
                _fillSellOrder(ret);
            } else if (!cancelOnCond || buyCond(prevRow, df, i - 1)) {
                console.log(`${row.ts} \t CANCELLING SELL ORDER`);
                mData["data"].push({
                    side: `sell \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                    c: exitLimit,
                    ts: prevRow.ts,
                    cancel: true,
                    enterTs,
                });

                exitLimit = null;
            }
        }

        /* if (entry != 0) _entry = entry
        if (exit != 0) _exit = exit

        if (!pos && exit != 0) {
            skip = !(prevRow.ha_l <= exit && exit <= prevRow.ha_h);
        }
        if (pos && entry != 0) {
            skip = !(prevRow.ha_l <= entry && entry <= prevRow.ha_h);
        } */

        /* if (skip) continue;
        else {
            if (exit !=0) exit = 0
            if (entry !=0) entry = 0
        } */
       const _tp = entry * (1 + TP/100)
          const isTp = prevRow.h >= _tp
        if (!pos && !entryLimit && buyCond(prevRow)) {
            /* PLACE MARKET BUY ORDER */
            entryLimit = isMarket ? row.o : prevRow.ha_c;
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
            }
        } else if (  pos && isTp || (!exitLimit && sellCond(prevRow, entry))) {
            exitLimit = isTp ? _tp : (isMarket ? row.o : prevRow.ha_c)
            exitLimit = toFixed(exitLimit!, pricePrecision);
            //entry = entryLimit;
            enterTs = row.ts;

            if (isMarket || isTp) {
                console.log(`[ ${row.ts} ] ${ isTp ? 'TPP' : 'Market'} sell order at ${exitLimit}`);
                exit = toFixed(exitLimit, pricePrecision);
                const ret = fillSellOrder({
                    exitLimit,
                    exit,
                    prevRow: theRow,
                    entry: _entry,
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
                    entryLimit,maker
                });
                _fillSellOrder(ret);
            } else {
                console.log(`[ ${row.ts} ] Limit sell order at ${exitLimit}`);
            }
        }

    }

    console.log(`\nTRADES: ${cnt}`);

    const oKeys = Object.keys(mData.data);
    const lastPos = mData.data[oKeys[oKeys.length - 1]];
    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    if (lastPos && lastPos.side.startsWith("buy")) {
        console.log("ENDED WITH BUY");
        ///balance = lastPos.c * lastPos.base;
    }
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };
    return _data;
};
