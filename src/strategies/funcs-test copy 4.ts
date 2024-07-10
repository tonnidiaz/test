import { Strategy } from "@/classes/strategy";
import { data } from "@/data/data";
import {
    MAKER_FEE_RATE,
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

let _cnt = 0
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
    base = (balance / entry) * (1 - taker);
    console.log(balance, base, entry, taker, basePrecision);
    base = toFixed(base, basePrecision);
    console.log(`BASE: ${base}`);

    const data = { ...mData };
    const ts = prevRow.ts
    data["data"][data["data"][ts] ? `[Buy] ${ts}` : ts] = {
        side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
        fill: entryLimit,
        enterTs,
        c: entry,
        balance: `[${balance}] \t ${base} \t -${base * taker!}`,
    };
    pos = true;
    _cnt = 0
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
        sl: number = 0,
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

        const fillSellOrder = (
            _exitLimit: number,
            _exit: number,
            _prevRow: IObj
        ) => {
            console.log({ balance, base, _exitLimit, _exit, entry, maker });
            console.log(`MIKA: ${_exit >= entry ? "gain" : "loss"}`);
            balance = base * _exit * (1 - maker);
            balance = toFixed(balance, pricePrecision);
            const ts = _prevRow["ts"];
            mData["data"][mData["data"][ts] ? `[Sell] ${ts}` : ts] = {
                side: `sell \t {h:${_prevRow.h}, l: ${_prevRow.l}}`,
                fill: _exitLimit,
                enterTs,
                c: _exit,
                balance: `[${balance}] \t ${base}`,
            };
            /* Position now filled */
            entryLimit = null;
            base = 0;
            exitLimit = null;
            pos = false;

            if (_exit >= entry) gain += 1;
            else loss += 1;
            cnt += 1;
        };

        console.log(`\n${prevRow.ts}\n`);
        const isGreen = prevRow.ha_c > prevRow.ha_o;
        function isLessThan(entry: number, p: number) {
            return prevRow.h < entry * (1 + p / 100);
        }
        if (pos) {
            if (prevRow.l <= sl && sl <= prevRow.h) {
                /* FILL SL ORDER IF ANY */
                console.log("FILL @ SL");
                exit = toFixed(sl, pricePrecision);
                fillSellOrder(exitLimit ?? 0, exit, prevRow);
            } /* else if (sellCond(prevRow, entry)) {
                CANCEL SL ORDER AND PLACE MARKET SELL
                continue
                console.log(`[ ${row.ts} ] CANCELLING SL ORDER...\n`);

                exit = row.o;
                exit = toFixed(exit!, pricePrecision);
                enterTs = row.ts;
                fillSellOrder(exitLimit ?? 0, exit, row);
            }  */ else if (tp && prevRow.l <= tp && tp <= prevRow.h) {
                exit = toFixed(tp, pricePrecision);
                enterTs = prevRow.ts;
                console.log("FILL @ TP");
                fillSellOrder(exitLimit!, exit, prevRow);
            } else {
                /* PRICE IS GOING UP AND NO SIGNAL YET */
                /* EXTEND SL */
                //
                //const p = 1.5//5;//isGreen ? 5.5 : 3
                //
                //console.log(`[ ${row.ts} ] EXTENDING SL ORDER BY ${p}%...\n`);
                //const _sl = isGreen || true ? entry : prevRow.l
                //sl = toFixed(_sl * (1 + p/100), pricePrecision);
                /* const p = isGreen ? 10 : 5
                tp = entry * (1 + p/100)
                console.log(`TP ORDER AT ${tp}`);
                enterTs = row.ts */
                //sl = entry * (1 + 3.5/100)
                if (_cnt >= 5 && prevRow.c > entry){
                    //tp = toFixed(entry * (1 + (TP + _cnt)/100), pricePrecision)
                     enterTs += `\n${row.ts}`;
                     fillSellOrder(exitLimit ?? 0, row.o, row)
                }
                   

            }
        }

        if (!pos && buyCond(prevRow)) {
            /* PLACE MARKET BUY ORDER */
            entryLimit = row.o;
            entryLimit = toFixed(entryLimit!, pricePrecision);
            entry = entryLimit;
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] Market buy order at ${entryLimit}`);

            const ret = fillBuyOrder({
                entry,
                prevRow: row,
                entryLimit,
                enterTs,
                taker,
                base,
                balance,
                basePrecision,
                mData: { ...mData },
                pos,
            });
            (pos = ret.pos),
                (base = ret.base),
                (mData = ret.mData),
                (balance = ret.balance);

            /* PLACE SELL ORDER AT SL */

            const startI = i > d ? i - d : 0;
            sl = useSwindLow
                ? Math.min(...df.slice(startI, i).map((el) => el.l))
                : calcSL(entry);
            sl = toFixed(sl!, pricePrecision);
            exitLimit = sl;
            enterTs = row.ts;
            tp = entry * (1 + TP / 100);
        }

        _cnt += 1
    }

    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };
    return _data;
};
