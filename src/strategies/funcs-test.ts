import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
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
    const useExp = false,
        useTrailing = false,
        useBillo = false,
        useSLTP = false,
        useFallbackSL = false,
        useHeader = false;

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
    if (false) {
        return strOld({
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
        exit: number = 0,
        enterTs = "";
    console.log({platNm});
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
        const nextRow: ICandle = df[i + 1] ?? {}
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

            base = 0;
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
            balance = 0;
        };

        async function _fillSell(_exit: number, _row: ICandle, isSl?: boolean) {
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

        function _fillBuy(_entry: number, _row: ICandle, isA?: boolean) {
            if (!entryLimit) entryLimit = entry;
            
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
                isA
            });
            
            _fillBuyOrder(ret);
        }

        const isGreen = prevRow.c >= prevRow.o;
        const isSum = prevRow.c > row.o;

        if (!pos && entryLimit) {
            const _row = row;
            
            console.log("HAS NO POS");
            const {o, c} = _row
            const useO = (prevRow.h > prevRow.c && !isSum)
             entry = useO ? o : c;
            _fillBuy(entry, row);
            //continue
            
            
        }
   
         if (pos && exitLimit) {
            exitLimit = prevRow.h
            exit = 0;
            const _row = row;
            console.log("HAS POS");

            let goOn = true,
                is_curr = false,
                isClose = false;

            const { h, l, c, o } = _row;

            const SL = 1
            const _sl = entry * (1 - SL / 100);
           
            
            const isO = prevRow.h == prevRow.o
            if (!isGreen && exitLimit >=_sl){
                exit = exitLimit 
            }else{
                const _c = nextRow.o ?? c
               exit = isO ? o : _c
                isClose = true 
            }
        
            if (h < exit) {
                console.log("NEITHER");
                continue
            }
            // if (isGreen && o > exit){exit = o}

            if (goOn && (isClose || exit >= _sl)) {

                if (isClose ) {
                    if ((isO && o < _sl) || (!isO && c < _sl))
                    {
                        continue
                        }
                }
                const p = "EXIT";
                console.log("\nFILLING SELL ORDER AT", p);
                _fillSell(exit, _row, false);

                console.log({ is_curr });
                enterTs = nextRow.ts

                if (isO){
                    entryLimit = null
                }else{
                   entryLimit = l
                if (c < o){
                    entryLimit *= (1 - 2.5/100)
                } 
                }
                
            }

            //if (!isO)
                continue;
        }

        if (!pos && buyCond(prevRow, df, i)) {
            console.log("\nKAYA RA BUY\n");
            // Place limit buy order
            entryLimit = row.c
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(2)}`
            );
            if (isMarket) {
                entry = i == 1 ? row.o : nextRow.o;
                if (i != 1) {
                    entryLimit = row.o
                    //continue
                    if (entry > row.c) {
                        entryLimit = row.l
                        continue
                    }
                }
                _fillBuy(entry, row, i == 1);
            }
        }  
         if (pos) {
            enterTs = nextRow.ts
            const {h} = row
            exitLimit = h
            
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
