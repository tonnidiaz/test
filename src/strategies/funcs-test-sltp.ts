import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    TAKER_FEE_RATE,
    TP,
    isMarket,
    noFees,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";
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
        tgtBuy: number | null = null,
        exit: number = 0,
        enterTs = "",
        skip = false,
        l = 0,
        w = 0,
        c = 0,
        profit: number = 0;
    const pricePrecision = getPricePrecision(pair, "okx");
    const basePrecision = getCoinPrecision(pair, "limit", "okx");
    balance = toFixed(balance, pricePrecision);
    const d = useSwindLow ? 20 : 0;
    df = df.slice(d);

    for (let i = d + 1; i < df.length; i++) {
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
                (loss = ret.loss);
            sellFees += ret.fee;
            exitLimit = null;
            entryLimit = null;
        };
        const _fillBuyOrder = (ret: ReturnType<typeof fillBuyOrder>) => {
            (pos = ret.pos),
                (base = ret.base),
                (mData = ret.mData),
                (_cnt = ret._cnt);
            enterTs = row.ts;
            buyFees += ret.fee;
            tp = toFixed(entry * (1 + TP / 100), pricePrecision);
            sl = toFixed(entry * (1 - SL / 100), pricePrecision);
            buyFees += ret.fee;
        };
        const isGreen = prevRow.c >= prevRow.o;

        async function _fillSell(_exit: number, _row: IObj, isSl?: boolean) {
            const ret = fillSellOrder({
                exitLimit,
                exit: _exit,
                prevRow: _row,
                entry: entry,
                base,
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

        function _fillBuy(_entry: number, _row: IObj) {
            if (!entryLimit) return;
            const ret = fillBuyOrder({
                entry: _entry,
                prevRow: _row,
                entryLimit,
                enterTs,
                taker,
                balance, //: _bal,
                basePrecision,
                mData: { ...mData },
                pos,
            });
            _fillBuyOrder(ret);
        }

        if (!pos && entryLimit) {
            entry = row.o;
            _fillBuy(entry, row);
        } else if (pos) {
            let cont = true,
                is_sl = false;
            const exitRow = prevRow;
            const slRow = prevRow;


            if (false){}
            else if (sl && isGreen 
                //&& exitLimit
                && slRow.l < sl && sl < Math.max(slRow.ha_c, slRow.ha_o) && false )
                {exit = row.o; is_sl = true}
            else if (exitLimit && exitLimit < exitRow.h){
                exit = exitLimit
                tgtBuy = row.o
            }/* else if (sl && isGreen && exitLimit
                && slRow.l < sl && sl < Math.min(slRow.ha_c, slRow.ha_o)
            ){
                exit = row.o
            } */
            else {cont = false}

            if (cont){
                _fillSell(exit, row)
            }
        }

        console.log(`\nLOSS" ${l}\n`);
        if (!pos && (useAnyBuy || buyCond(prevRow))) {
            /* PLACE MARKET BUY ORDER */
            entryLimit = isMarket ? row.o : prevRow.ha_c;
            entryLimit = toFixed(entryLimit!, pricePrecision);
            enterTs = row.ts;

            if (isMarket) {
                let cont = true;
                console.log(`[ ${row.ts} ] Market buy order at ${entryLimit}`);

                if (exit == 0) {
                    entry = row.o;
                } else if (exit != 0 && tgtBuy) {
                    const diff = ((exit - tgtBuy) / tgtBuy) * 100;
                    if (diff < 2) entry = exit;
                    else {
                        cont = false;
                    }
                } else {
                    cont = false;
                }
                //balance -= _bal;
                if (true) {
                    entry = row.o;
                    const ret = fillBuyOrder({
                        entry,
                        prevRow: row,
                        entryLimit,
                        enterTs,
                        taker,
                        balance, //: _bal,
                        basePrecision,
                        mData: { ...mData },
                        pos,
                    });
                    _fillBuyOrder(ret);
                    tgtBuy = null;
                    exit = 0;
                }
            } else {
                console.log(`[ ${row.ts} ] Limit buy order at ${entryLimit}`);
            }
        } else if (pos
             && !exitLimit 
            && sellCond(prevRow, entry)) {
            exitLimit = Math.max(prevRow.ha_o, prevRow.o);
            //sl = Math.min(prevRow.ha_o, prevRow.ha_c)
            enterTs = row.ts;
            /*  const rf = true;
            exitLimit = rf ? Math.min(prevRow.ha_h, prevRow.h) : prevRow.ha_h;
            const perc = rf ? 1.5 : 0;
            if (exitLimit) exitLimit *= 1 + perc / 100;
            enterTs = row.ts; */
            // exitLimit = prevRow.o
            _fillSell(prevRow.ha_c, row)
            
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
