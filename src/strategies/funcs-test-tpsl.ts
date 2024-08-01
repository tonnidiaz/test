import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    SL2,
    TAKER_FEE_RATE,
    TP,
    TRAILING_STOP_PERC,
    WCS1,
    isMarket,
    rf,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";

import {
    getCoinPrecision,
    getPricePrecision,
    isBetween,
    randomNum,
    toFixed,
} from "@/utils/functions";
import { IObj } from "@/utils/interfaces";
import { strategy as strTrillo } from "./funcs-test-trillo";

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
        enterTs = "";

    const pricePrecision = getPricePrecision(pair, platNm);
    const basePrecision = getCoinPrecision(pair, "limit", platNm);

    console.log({ pricePrecision, basePrecision });
    balance = toFixed(balance, pricePrecision);
    //df = df.slice(20);

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
                (balance += ret.balance),
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
                (base += ret.base),
                (mData = ret.mData),
                (_cnt = ret._cnt);
            enterTs = row.ts;
            buyFees += ret.fee;
            // tp = toFixed(entry * (1 + TP / 100), pricePrecision);
            // sl = toFixed(entry * (1 - SL / 100), pricePrecision);
        };

        async function _fillSell({
            _exit,
            _row,
            isSl,
            _base,
        }: {
            _exit: number;
            _row: IObj;
            isSl?: boolean;
            _base: number;
        }) {
            base -= _base;
            const ret = fillSellOrder({
                exitLimit,
                exit: _exit,
                prevRow: _row,
                entry: entry,
                base: _base,
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
        function _fillBuy({
            _amt,
            _entry,
            _row,
        }: {
            _amt: number;
            _entry: number;
            _row: IObj;
        }) {
            if (!entryLimit) entryLimit = _entry;
            balance -= _amt;
            const ret = fillBuyOrder({
                entry: _entry,
                prevRow: _row,
                entryLimit,
                enterTs,
                taker,
                balance: _amt, //: _bal,
                basePrecision,
                mData: { ...mData },
                pos,
            });
            _fillBuyOrder(ret);
        }
        const isGreen = prevRow.c >= prevRow.o;

        if (pos && tp && sl) {
            console.log("NYOSHI");
            const { o } = row;
            let _exit = 0,
                go = true;

            if (prevRow.ha_h <= sl && !isGreen) {
                //  _exit = o
            } else {
                go = false;
            }
            if (go && _exit != 0) {
                //_fillSell({ _exit, _row: row, _base: base });
            }
        }

        if (!pos && buyCond(prevRow, df, i)) {
            // Place limit buy order
            entryLimit = isMarket ? row.o : prevRow.ha_o;
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(
                    pricePrecision
                )}`
            );
            if (entryLimit && isMarket) {
                entry = row.o;
                const _amt = balance;
                _fillBuy({ _entry: entry, _row: row, _amt });
            }
        }
        if (pos) {
            const rf = true;
            const { o, ha_o } = row;
            tp = Number((o * (1 + TP / 100)).toFixed(pricePrecision));
            sl = entry * (1 - SL / 100);
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${tp}`);
        }

        if (pos && tp && sl) {
            const erow = row;
            const { o, h, l, c } = erow;
            const belowH = Number(
                (h * (1 - TRAILING_STOP_PERC / 100)).toFixed(pricePrecision)
            );
            let _exit = 0;
            let go = true;

            const MIN_TRAIL = tp; //entry * (1 + .02/100)

            console.log("\n", { MIN_TRAIL, belowH }, "\n");
            /*  if (tp <= h) {
                _exit = tp < l ? l : tp;
            }
            else  */ if (belowH >= MIN_TRAIL /* && c > o */) {
                const bh = WCS1 ? MIN_TRAIL : belowH;
                _exit = c > bh && c >= MIN_TRAIL ? c : bh;
                if (l > _exit) continue;
            } 
           
            else {
                go = false;
            }
            if (go && _exit != 0) {
                const _base = base;
                _fillSell({ _exit, _row: erow, _base });
            }
        }
    }

    const oKeys = Object.keys(mData.data);
    const lastPos = mData.data[oKeys[oKeys.length - 1]];
    if (lastPos && lastPos.side.startsWith("buy")) {
        console.log("ENDED WITH BUY");
        balance = lastPos._c * lastPos.base;
    }
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };
    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
