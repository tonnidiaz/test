import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    SL2,
    TAKER_FEE_RATE,
    TP,
    isMarket,
    rf,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";

import {
    getCoinPrecision,
    getPricePrecision,
    isBetween,
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
    const useTrillo = false;
    if (useTrillo)
        return strTrillo({
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

    const pricePrecision = getPricePrecision(pair, "okx");
    const basePrecision = getCoinPrecision(pair, "limit", "okx");

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
        };

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
        const isGreen = prevRow.c >= prevRow.o;

        if (pos && exitLimit) {
            console.log("HAS POS");

            let goOn = true,
                isSl = false;

            const _exitLimit = exitLimit;
            const exitRow = prevRow;
            const isStdHit = exitLimit <= exitRow.h;
            const eFromH = Number(
                (((exitLimit - exitRow.h) / exitRow.h) * 100).toFixed(2)
            );

            const {o,h,l,c} = exitRow
            let exitChanged = false
            if (exitLimit >= o || true) {
               exitLimit = o * (1 + .15/100)
                exitChanged = true
            }

            if (exitLimit) {
                
                if (_exitLimit < exitRow.h) {
                    console.log("STD HIT");
                    exitLimit = _exitLimit * (1 + 3.5 / 100); // ok
                }else {
                   // OPEN PX HERE
                  
                   //goOn = false
                   if (c > exitLimit || h < exitLimit * (1 + .15/100) ) {
                    continue
                   }else{
                    console.log({stop: exitLimit, tp: (exitLimit * (1 +3/100)).toFixed(2), _exitLimit ,o,h,l,c});
                   }
                }
                if (exitLimit < exitRow.h) {
                    exit = exitLimit;
                } 
                 else {
                    goOn = false;
                    console.log("NEITHER");
                }
                if (goOn) {
                    const p = "EXIT";
                    console.log("\nFILLING SELL ORDER AT", p);
                    _fillSell(exit, exitRow, isSl);
                //    continue
                }
            }
        }

        if (!pos && (useAnyBuy || buyCond(prevRow, df, i))) {
            if (entryLimit) {
                console.log("BUY ORDER NOT FILLED, RE-CHECKING SIGNALS");
            }
            // Place limit buy order
            entryLimit = isMarket ? row.o : prevRow.ha_o;
            enterTs = row.ts;

            if (entryLimit && isMarket) {
                entry = row.o
                _fillBuy(entry, row);
            }
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(2)}`
            );
        }  
        if (pos && sellCond(prevRow, entry, df, i)) {
            const rf = true;
            exitLimit = rf
                ? Math.max(prevRow.sma_50, prevRow.sma_20, prevRow.ha_c)
                : Math.min(prevRow.ha_c, prevRow.ha_o);
            const perc = .15// rf ? 1.3 : 0;
            if (exitLimit) exitLimit *= 1 + perc / 100;
            // exitLimit = Math.min(prevRow.ha_c, prevRow.ha_o); //* (1-.5/100)
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
