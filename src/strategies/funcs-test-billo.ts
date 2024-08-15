import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    TAKER_FEE_RATE,
    isMarket,
    rf,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";

import {
    getCoinPrecision,
    getPricePrecision,
    toFixed,
} from "@/utils/functions";
import { IObj, ICandle } from "@/utils/interfaces";
import { strategy as strBillioBuy } from "./funcs-test-billo-BUY";
import { strategy as strBillioSell } from "./funcs-test-billo-SELL";
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
    sellCond: (row: ICandle, entry: number, df?: ICandle[], i?: number) => boolean;
    pair: string[];
    maker: number;
    taker: number;
    lev?: number;
    trades: IObj[];
    platNm: "binance" | "bybit" | "okx";
}) => {
    const useBuy = null;

    const str = useBuy ? strBillioBuy : strBillioSell;

    if (useBuy != null) {
        return str({
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
    }

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
        const prevrow = df[i - 1],
            nextRow = df[i + 1],
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
        };

        async function _fillSell(_exit: number, _row: ICandle, isSl?: boolean) {
            const ret = fillSellOrder({
                exitLimit,
                exit: _exit,
                prevrow: _row,
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
        const _fillBuy = (_entry: number, _row: ICandle) => {
            if (!entryLimit) entryLimit = _entry;
            const ret = fillBuyOrder({
                entry: _entry,
                prevrow: _row,
                entryLimit,
                enterTs,
                taker,
                balance, //: _bal,
                basePrecision,
                mData: { ...mData },
                pos,
            });
            _fillBuyOrder(ret);
        };
        const isGreen = prevrow.c >= prevrow.o;

        if (!pos && entryLimit){

            const _row = prevrow
            const {o, h, l, c ,ha_h, ha_l, ha_c} = _row
            if (l <= entryLimit){
                entry =  entryLimit
                
                _fillBuy(entry, _row)
            }
        }
        if (pos && exitLimit){

            const _row = prevrow
            const {o, h, l, c ,ha_h, ha_l, ha_c} = _row
            if (exitLimit <= h){
                exit = exitLimit
                _fillSell(exit, _row)
            }
            // else if (exitLimit <= ha_h && c > exitLimit * (1 - .1/100)){
            //     exit = row.o
            //     _fillSell(exit, _row)
            // }
        }

        if (
            !pos &&
            //&& !entryLimit
            buyCond(prevrow, df, i)
        ) {
            // Place limit buy order
            entryLimit = row.o
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t MARKET buy order at ${entryLimit?.toFixed(pricePrecision)}`
            );
            /* if (entryLimit && isMarket) {
                entry = row.o;
                _fillBuy(entry, row);
            } */
        }
        if (pos && sellCond(prevrow, entry)) {
            const rf = true;
            exitLimit = prevrow.h * (1 + 3.5/100); //rf ? Math.max(prevrow.ha_h, prevrow.h) : prevrow.ha_o;
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
        }

        if (pos && exitLimit) {
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
