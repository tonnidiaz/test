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

    let mData: IObj = { data: {} },
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
        skip = "",
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
        };
        if (pos && (exitLimit || sl || tp)) {
            console.log("HAS POS OR SL");
            const _tp = tp;
            const _sl = sl;
            const _pos = pos;
            const isSl = sl && prevRow.l <= sl;
            if (
                sl &&
                sl <= entry &&
                prevRow.l <= sl /*  && sl <= prevRow.h */
            ) {
                /* FILL SL ORDER IF ANY */
                console.log("FILL @ SL");
                exit = toFixed(sl, pricePrecision);
                const ret = fillSellOrder({
                    exitLimit,
                    exit,
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

                _fillSellOrder(ret);
                if (skip == prevRow.ts) skip = row.ts;
            } else if (tp && /* prevRow.l <= tp &&  */ tp <= prevRow.h) {
                /* FILL SL ORDER IF ANY */
                console.log("FILL @ TP");
                exit = toFixed(tp, pricePrecision);
                const ret = fillSellOrder({
                    exitLimit,
                    exit,
                    prevRow,
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
                _fillSellOrder(ret);
            } else if (_cnt - 1 >= 10 && prevRow.c < entry) {
                console.log("FILL AFTER SOME CANDLES");
                //exit = toFixed(row.o, pricePrecision);
                /* const ret = fillSellOrder({
                    exitLimit,
                    exit,
                    prevRow,
                    _bal,
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
                _fillSellOrder(ret); */
            }
            if (!pos) {
                console.log({
                    _pos,
                    entry,
                    l: prevRow.l,
                    _sl,
                    _tp,
                    isSl,
                    h: prevRow.h,
                });
            }
        } else if (!pos && entryLimit) {
            console.log("NO POS");
            if (!isMarket && prevRow.l <= entryLimit) {
                entry = entryLimit > prevRow.h ? prevRow.h : entryLimit;
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
            }
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
                (pos = ret.pos),
                    (base = ret.base),
                    (mData = ret.mData),
                    (balance = ret.balance);
                //tp = toFixed(entry * (1 + TP / 100), pricePrecision);
                //sl = toFixed(entry * (1 - SL / 100), pricePrecision);
            } else {
                console.log(`[ ${row.ts} ] Limit buy order at ${entryLimit}`);
                if (row.l <= entryLimit) {
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
                }
            }
        } else if (pos && sellCond(prevRow, entry)) {
            //enterTs = row.ts
            //exitLimit = prevRow.sma_20
        }
    }

    const oKeys = Object.keys(mData.data);
    const lastPos = mData.data[oKeys[oKeys.length - 1]];
    if (lastPos.side.startsWith("buy")) {
        console.log("ENDED WITH BUY");
        balance = lastPos.c * lastPos.base;
    }
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };
    return _data;
};
