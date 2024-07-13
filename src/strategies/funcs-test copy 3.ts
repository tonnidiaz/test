import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    TAKER_FEE_RATE,
    TP,
    isMarket,
    noFees,
    useSwindLow,
} from "@/utils/constants";
import { parseDate } from "@/utils/funcs2";
import {
    getCoinPrecision,
    getPricePrecision,
    isSameDate,
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
    platNm: "binance" | "bybit" | "okx"
}) => {
    let pos = false;
    let cnt = 0,
        gain = 0,
        loss = 0,
        buyFees = 0,
        sellFees = 0;

    let mData: IObj = { data: [] },
        _data: IObj;
    console.log("STR_WITH_TRADES: BEGIN BACKTESTING...\n");
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
    balance = toFixed(balance, pricePrecision);
 
    console.log({trades: {...trades[0]}});

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
        if (pos) {
            console.log("HAS SL OR TP");
            const slIndex = trades.findIndex(el=> {
                const ts = Date.parse(el.ts)
                const date = new Date(ts)
                const candleDate = new Date(prevRow.ts)
                //console.log("\nSL_INDEX: ", {date, candleDate});
                return Number(el.px) <= sl! && isSameDate(date, candleDate) } )
            const tpIndex = trades.findIndex(el=> {
                const ts = Date.parse(el.ts)
                const date = new Date(ts)
                const candleDate = new Date(prevRow.ts)
                //console.log("\nTP_INDEX: ", {date, candleDate});
                return Number(el.px) >= tp! && isSameDate(date, candleDate) } )
            
            console.log({slIndex, tpIndex});
            console.log(trades[slIndex], trades[tpIndex]);

            const slFirst = slIndex != -1 && ( tpIndex == -1 || slIndex < tpIndex)
            const tpFirst = tpIndex != -1 && ( slIndex == -1 || tpIndex < slIndex)
            console.log({slFirst, tpFirst, sl, l: prevRow.l});

            if (((slFirst || prevRow.l <= sl!)) && prevRow.c >= prevRow.o ){
                console.log("FILL @ SL");
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
                });
                w = 0;
                l += 1;
                _fillSellOrder(ret);
            }
            else if (tpFirst && tp){
                console.log("FILL @ TP");
                exit = tp
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
           /*  if ( slFirst /* prevRow.c > prevRow.o ){
             if (
                pos &&
                sl &&
                sl <= entry &&
                prevRow.l <= sl /* &&
                prevRow.c >= prevRow.o                                                               
            ) {
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
                });
                w = 0;
                l += 1;
                _fillSellOrder(ret);
            } if (pos && tp && prevRow.h >= tp /* && prevRow.c >= prevRow.o ) {
                /* FILL TP ORDER IF ANY 
                console.log("FILL @ TP");
                exit = tp
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
            }
            if (pos && tpFirst){
                if (pos && tp && prevRow.h >= tp /* && prevRow.c >= prevRow.o ) {
                    /* FILL TP ORDER IF ANY 
                    console.log("FILL @ TP");
                    exit = tp
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
                if (
                    pos &&
                    sl &&
                    sl <= entry &&
                    prevRow.l <= sl &&
                    prevRow.c >= prevRow.o                                                                
                ) {
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
                    });
                    w = 0;
                    l += 1;
                    _fillSellOrder(ret);
                }
            } */
            
        }

        console.log(`\nLOSS" ${l}\n`);
        if (!pos && buyCond(prevRow)) {
            /* PLACE MARKET BUY ORDER */
            entryLimit = isMarket ? row.o : prevRow.ha_c;
            entryLimit = toFixed(entryLimit!, pricePrecision);
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
