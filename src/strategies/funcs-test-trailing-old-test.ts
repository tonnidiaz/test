/**
 * 2024 [73] [PEPE-USDT] [ANY]: 	USDT 10,030.50
 */

import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    SL2,
    TAKER_FEE_RATE,
    TP,
    isMarket,
    rf,
    TRAILING_STOP_PERC,
    useSwindLow,
    WCS1,
    WCS2,
} from "@/utils/constants";

import {
    findAve as calcAve,
    getCoinPrecision,
    getPricePrecision,
    isBetween,
    randomNum,
    toFixed,
} from "@/utils/functions";
import { IObj, ICandle } from "@/utils/interfaces";
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
    df: ICandle[];
    balance: number;
    buyCond: (row: ICandle, df?: ICandle[], i?: number) => boolean;
    sellCond: (
        row: ICandle,
        entry: number,
        df?: ICandle[],
        i?: number
    ) => boolean;
    pair: string[];
    maker: number;
    taker: number;
    lev?: number;
    trades: IObj[];
    platNm: "binance" | "bybit" | "okx";
}) => {
    console.log(df[0].ts);

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
        lastPrice = 0,
        sl: number | null = null,
        exit: number = 0,
        enterTs = "";

    const prAve: number[] = [];
    const pricePrecision = getPricePrecision(pair, platNm);
    const basePrecision = getCoinPrecision(pair, "limit", platNm);

    console.log({ pricePrecision, basePrecision });
    balance = toFixed(balance, pricePrecision);
    //df = df.slice(20);

    console.log(trades);
    const lastRow = df[df.length - 1]
    for (let i = d + 1; i < df.length; i++) {
        //if (balance < 10) continue;
        const prevrow = df[i - 1],
            row = df[i];
        const nextRow = df[i + 1] ?? row;
        

        console.log(`\nTS: ${row.ts}`);
        _cnt += 1;
        lastPrice = entry;
        //if (row.v == 0) continue;

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
            tp = toFixed(entry * (1 + TP / 100), pricePrecision);
            sl = toFixed(entry * (1 - SL / 100), pricePrecision);
        };

        async function _fillSell({
            _exit,
            _row,
            isSl,
            _base,
            o,
        }: {
            _exit: number;
            _row: ICandle;
            isSl?: boolean;
            _base: number;
            o?: number;
        }) {
            base -= _base;
            const ret = fillSellOrder({
                exitLimit,
                exit: _exit,
                prevrow: _row,
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
                o,
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
            _row: ICandle;
        }) {
            //if (toFixed(_amt / _entry, basePrecision) <= 0) return;
           // if (Date.parse(row.ts) >= Date.parse(lastRow.ts) - 120 * 24 * 60 * 60000) return
            if (!entryLimit) entryLimit = _entry;
            balance -= _amt;
            const ret = fillBuyOrder({
                entry: _entry,
                prevrow: _row,
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
        const isGreen = prevrow.c >= prevrow.o;

        /* if (!pos && entryLimit) {
            if (row.l <= entryLimit) {
                entry = entryLimit;
                _fillBuy({ _amt: balance, _entry: entry, _row: row });
                continue;
            }
        } */
        if (pos && exitLimit) {
            let _e = exitLimit;

            const _sl = entry * (1 - SL / 100);
            const _tp = entry * (1 + TP / 100);
        }

        

        if (!pos && buyCond(prevrow)) {
            /* BUY SEC */

            // Place limit buy order
            entryLimit = isMarket ? row.o : prevrow.ha_o;
            enterTs = row.ts;

            if (entryLimit && isMarket) {
                entry = row.o;
                console.log(
                    `[ ${row.ts} ] \t MARKET buy order at ${entry?.toFixed(
                        pricePrecision
                    )}`
                );
                _fillBuy({ _entry: entry, _row: row, _amt: balance });
            }
            //continue;
        }
        if (pos && !exitLimit) {
            /* SELL SECTION */
            const rf = true;
            const isCurr = prevrow.c < row.o || !isGreen;
            exitLimit = prevrow.c * (1 - .5/100);
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
            // if (isCurr)
        }
        if (pos && exitLimit) {
            const _row = row;
            const { o, h, l, c, ha_h } = _row;
            let isClose = false
            let tp = Number((o * (1 + TP / 100)).toFixed(pricePrecision));
            const sl = Number((entry * (1 - SL / 100)).toFixed(pricePrecision));
            const stop = Number(
                (h * (1 - TRAILING_STOP_PERC / 100)).toFixed(pricePrecision)
            );
            let _exit: number | undefined;
            /* if (exitLimit <= h) {
                _exit = exitLimit
               
            } else  */if (c >= h && c >= exitLimit * (1 - 0/100)/*  && c >= sl */) {
                _exit = c;
                isClose = true
            } /* else if (row.o >= sl) {
                _exit = row.o;
            }*/else if (tp >= sl && h >= tp && c > o){
                _exit = c
                isClose = true
            } 

            //_exit = tp
            if (_exit && _exit <= h) {
                exit = isClose ? nextRow.o : _exit;
                _fillSell({ _exit, _row, _base: base });
            }
        }
    }

    if (base != 0) {
        console.log("ENDED WITH BUY");
        let _bal = lastPrice * base;
        _bal *= 1 - taker;
        balance += _bal;
    }
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };

    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
