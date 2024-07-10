
import { Strategy } from "@/classes/strategy";
import { data } from "@/data/data";
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
function fillBuyOrder({
    entry,
    prevRow,
    taker,
    enterTs,
    base,
    balance,
    mData,
    entryLimit,
    basePrecision,
    pos,
}: {
    entry: number;
    prevRow: any;
    taker: number;
    enterTs: string;
    base: number;
    balance: number;
    basePrecision: number;
    mData: IObj;
    entryLimit: number;
    pos: boolean;
}) {
    base = balance / entry; // * (1 - taker);
    //console.log(balance, base, entry, taker, basePrecision);
    base = toFixed(base, basePrecision);
    //console.log(`BASE: ${base}`);

    const data = { ...mData };
    const ts = prevRow.ts;
    data["data"][data["data"][ts] ? `[Buy] ${ts}` : ts] = {
        side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
        fill: entryLimit,
        base,
        enterTs,
        c: entry,
        balance: `[${balance}] \t ${base} \t -${base * taker!}`,
    };
    pos = true;
    _cnt = 0;
    return { pos, base, balance, mData: data };
}
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
        profit: number = 0;

    const pricePrecision = getPricePrecision(pair, "bybit");
    const basePrecision = getCoinPrecision(pair, "sell", "bybit");
    balance = toFixed(balance, pricePrecision);
    df = df.slice(20);

    for (let i = d + 1; i < df.length; i++) {
        const prevRow = df[i - 1],
            row = df[i];
        let _bal = balance; // * (90/100)

        const fillSellOrder = (
            _exitLimit: number,
            _exit: number,
            _prevRow: IObj
        ) => {
            //console.log({ balance,_bal, base, _exitLimit, _exit, entry, maker });
            //console.log(`MIKA: ${_exit >= entry ? "gain" : "loss"}`);
            _bal = base * _exit; // * (1 - maker);
            _bal = toFixed(_bal, pricePrecision);
            const ts = _prevRow["ts"];
            mData["data"][mData["data"][ts] ? `[Sell] ${ts}` : ts] = {
                side: `sell \t {h:${_prevRow.h}, l: ${_prevRow.l}}`,
                fill: _exitLimit,
                enterTs,
                c: _exit,
                balance: `[${_bal}] \t ${base}`,
            };
            /* Position now filled */
            entryLimit = null;
            base = 0;
            exitLimit = null;
            sl = null;
            tp = null;
            pos = false;

            /* ADD FUNDS BACK TO PORTFOLIO */
            balance += _bal;
            if (_exit >= entry) gain += 1;
            else loss += 1;
            cnt += 1;
        };

        console.log(`\nTS: ${prevRow.ts}`);
       
        _cnt += 1;
        const isGreen = prevRow.ha_c > prevRow.ha_o;
        function isLessThan(entry: number, p: number) {
            return prevRow.h < entry * (1 + p / 100);
        }
        if (pos && (exitLimit || (sl || tp))) {
            console.log('HAS POS OR SL');
            const _tp = tp
            const _sl = sl
            const _pos = pos
            const isSl = sl && prevRow.l <= sl
            
            /*  if ( isMarket || exitLimit <= prevRow.h) {
                /* FILL SL ORDER IF ANY *0/
                //console.log("FILL @ SL");
                exit = isMarket ? prevRow.o : toFixed(exitLimit, pricePrecision);
                fillSellOrder(exitLimit ?? 0, exit, prevRow);
            }
            else */ if (sl && sl <= entry &&  prevRow.l <= sl) {
                /* FILL SL ORDER IF ANY */
                console.log("FILL @ SL");
                exit = toFixed(sl, pricePrecision);
                fillSellOrder(exitLimit ?? 0, exit, prevRow);
            } else if (tp && tp <= prevRow.h) {
                /* FILL SL ORDER IF ANY */
                console.log("FILL @ TP");
                exit = toFixed(tp, pricePrecision);
                fillSellOrder(exitLimit ?? 0, exit, prevRow);
            }
            else if (_cnt - 1 >= 10 && prevRow.c < entry){
                console.log("FILL AFTER SOME CANDLES");
                exit = toFixed(row.o, pricePrecision);
                fillSellOrder(exitLimit ?? 0, exit, prevRow);
            }
            else if (!cancelOnCond || buyCond(prevRow)) {
                /*   mData["data"][prevRow.ts] = {
                    side: `sell \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                    c: exitLimit,
                    enterTs: prevRow.ts,
                    cancel: true,
                };

                exitLimit = null; */
            }
            if (!pos){
                console.log({_pos, entry, _sl, _tp, l:   prevRow.l, isSl, h: prevRow.h});
            }
        } else if (!pos && entryLimit) {
            if (!isMarket && prevRow.l <= entryLimit) {
                entry = isMarket ? prevRow.o : entryLimit;
                balance -= _bal;
                const ret = fillBuyOrder({
                    entry,
                    prevRow: row,
                    entryLimit,
                    enterTs,
                    taker,
                    base,
                    balance: _bal,
                    basePrecision,
                    mData: { ...mData },
                    pos,
                });
                (pos = ret.pos),
                    (base = ret.base),
                    (mData = ret.mData),
                    (_bal = ret.balance);
                tp = toFixed(entry * (1 + TP / 100), pricePrecision);
                sl = toFixed(entry * (1 - SL / 100), pricePrecision);
            } else if (!cancelOnCond || sellCond(prevRow, entry)) {
                /* CANCEL */
                /*  mData["data"][prevRow.ts] = {
                    side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                    c: entryLimit,
                    pricePrecision,
                    enterTs: prevRow.ts,
                    cancel: true,
                };
                entryLimit = null;
                pos = false */
            }
        }

        if (!pos && buyCond(prevRow)) {
            /* PLACE MARKET BUY ORDER */
            entryLimit = row.o; //(isGreen ? prevRow.ha_o : prevRow.ha_c) * (1 + .5/100)
            entryLimit = toFixed(entryLimit!, pricePrecision);
            //entry = entryLimit;
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] Market buy order at ${entryLimit}`);
            entry = entryLimit;
            balance -= _bal;
            const ret = fillBuyOrder({
                entry,
                prevRow: row,
                entryLimit,
                enterTs,
                taker,
                base,
                balance: _bal,
                basePrecision,
                mData: { ...mData },
                pos,
            });
            (pos = ret.pos),
                (base = ret.base),
                (mData = ret.mData),
                (_bal = ret.balance);
            tp = toFixed(entry * (1 + TP / 100), pricePrecision);
            //sl = toFixed(entry * (1 - SL / 100), pricePrecision);
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

