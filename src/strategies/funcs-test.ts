import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    MAX_PROFIT_PERC,
    SL,
    TAKER_FEE_RATE,
    TP,
    isMarket,
    rf,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";

import {
    findAve,
    getCoinPrecision,
    getPricePrecision,
    randomNum,
    toFixed,
} from "@/utils/functions";
import { IObj, ICandle } from "@/utils/interfaces";
import { strategy as strExp } from "./funcs-test-eFromH";
import { strategy as strBillo } from "./funcs-test-billo";
import { strategy as strSLTP } from "./funcs-test-tpsl";
import { strategy as strTrailing } from "./funcs-test-trailing";
import { strategy as strOld } from "./funcs-test-old";
import { strategy as strHeader } from "./funcs-test-header";
import { strategy as strFallbackSL } from "./funcs-test-fallback-sl";
import { strategy as strTrExitTP } from "./fb/tr-exit-tp";
import { strategy as strBelowOpen } from "./funcs-test-below-open";
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
    const useExp = false,
        useTrailing = false,
        useBillo = false,
        useSLTP = false,
        useFallbackSL = true, useTrExitTP = false,
        useHeader = false,
        useBelowOpen = false;

    if (useBelowOpen) {
        return strBelowOpen({
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
    if (useTrExitTP) {
        return strTrExitTP({
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
    if (useHeader) {
        return strHeader({
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
   
    if (useTrailing) {
        return strTrailing({
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
    if (useFallbackSL) {
        return strFallbackSL({
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
    if (useBillo) {
        return strBillo({
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
    if (useSLTP) {
        return strSLTP({
            df,
            balance,
            buyCond,
            sellCond,
            lev,
            pair,
            maker,
            taker,
            platNm,
            trades,
        });
    }
    if (useExp) {
        return strExp({
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
        sl2: number | null = null,
        exit: number = 0,
        enterTs = "";
    const START_BAL = balance;
    const MAX_PROFIT = START_BAL * (1 + MAX_PROFIT_PERC / 100);

    console.log({ platNm });
    const pricePrecision = getPricePrecision(pair, platNm);
    const basePrecision = getCoinPrecision(pair, "limit", platNm);

    console.log({ pricePrecision, basePrecision });
    balance = toFixed(balance, pricePrecision);
    let lastPrice = 0, start_bal = balance, aside = 0;
    //df = df.slice(20);

    console.log(trades);

    let sellAfterBuy = false,
        useExit = false;
    let _trades: {entry: number, exit: number}[]=[];

    const takeProfit = () =>{
        console.log("\nTAKING PROFIT\n")
        const _aside = balance * (10/100)
        balance -= _aside
        aside += _aside
        start_bal = balance
    }
    for (let i = d + 1; i < df.length; i++) {
        //if (balance < 10) continue;

        const prevrow = df[i - 1],
            row = df[i];
        const nextRow: ICandle = df[i + 1] ?? {};
        console.log(`\nTS: ${row.ts}`);
        _cnt += 1;
        lastPrice = entry;

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

            base = 0;
            if (balance >= start_bal * (1 + 50/100)){
                takeProfit()
            }
        };
        const _fillBuyOrder = (ret: ReturnType<typeof fillBuyOrder>) => {
            (pos = ret.pos),
                (base = ret.base),
                (mData = ret.mData),
                (_cnt = ret._cnt);
            enterTs = row.ts;
            buyFees += ret.fee;
            tp = Number((row.o * (1 + TP / 100)).toFixed(pricePrecision));
            sl = Number((entry * (1 - SL / 100)).toFixed(pricePrecision));
            sl2 = Number((entry * (1 - SL / 200)).toFixed(pricePrecision));
            balance = 0;
        };

        async function _fillSell(_exit: number, _row: ICandle, isSl?: boolean) {

            const c1 = _exit == entry
            if (false) return
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
            _trades.push({entry, exit: _exit})
        }
const isGreen = prevrow.c >= prevrow.o;
        const isSum = prevrow.c > row.o;
        
        function _fillBuy(_entry: number, _row: ICandle, isA?: boolean) {
            // let c1 = false
            // const _trLen = _trades.length
            // if (_trLen >= 2){
            //     for (let tr of _trades.slice(_trLen - 4)){
            //         c1 = c1 && tr.entry == tr.exit
            //     }
            // }
            // //&& /* isGreen &&  */!isSum // balance > START_BAL * (1 + 30000/100) //(balance * (Math.max(prevrow.o, prevrow.c))) / _entry < balance * (1 - 50 / 100)
            // const c2 = false
            // if (c1)
            //     return;
            if (!entryLimit) entryLimit = entry;

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
                isA,
            });
            _cnt = 0;
            _fillBuyOrder(ret);
        }

        

        if (!pos && !entryLimit && buyCond(prevrow)) {
            entry = row.o;
            _fillBuy(entry, row);

        continue;
           
        }

        if (!pos && entryLimit) {
            const _row = row;

            console.log("HAS NO POS");
            const { o, c, l } = _row;
            const useO = !isSum;
            if (useO) {
                entry = o;
            } else {
                entry = c;
            }
            _fillBuy(entry, row);
            if (!useO) continue;
            //continue
        }

        if (pos && exitLimit) {
                exitLimit = Math.max(prevrow.o , prevrow.c) * (1 + 3.5 / 100);

            exit = 0;
            const _row = row;
            console.log("HAS POS");

            let goOn = true,
                isClose = false;

            const { h, c, o } = _row;
            const _sl = entry * (1 - SL / 100);
            let _tp = Math.max(o, entry) * (1 + 10 / 100)
            _tp = Number(_tp.toFixed(pricePrecision))

            const isO = prevrow.h == prevrow.o;
if (false){
            }
        
            
            else if ((!isGreen && !isO) || useExit) {
                exit = exitLimit;
            } else {
                if (isO) {
                    exit = o;
                } else {
                    exit = isGreen ? o : c;
                    //isClose = true
                }
            }

            if (
                goOn &&
                (isClose ||
                    (useExit && exit <= h) ||
                    (exit >= _sl && h >= exit))
            ) {
                useExit = false;
                const p = "EXIT";
                console.log("\nFILLING SELL ORDER AT", p);
                _fillSell(exit, _row, false);

                enterTs = nextRow.ts;
                entryLimit = isO ? null : prevrow.l;
            }else if (row.c <= _sl && c >= entry ){
                exit = c
                _fillSell(exit, row)
            } else if (c >= _tp) {
                exit = c;
                _fillSell(exit, row);
                entryLimit = prevrow.l;
            }

            continue;
        }
        if (!pos && buyCond(prevrow, df, i)) {
            console.log("\nKAYA RA BUY\n");
            enterTs = row.ts;
            console.log(`HAS BUY SIGNAL...`);

            continue;
        }
        if (pos) {
            enterTs = nextRow.ts;
            const { h } = row;
            exitLimit = h;
        }
    }

    if (balance == 0 && base != 0) {
        console.log("ENDED WITH BUY");
        balance = lastPrice * base;
        balance *= 1 - taker;
    }

    balance += aside
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };

    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log({aside});
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
