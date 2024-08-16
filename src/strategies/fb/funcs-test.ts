import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    MAX_PROFIT_PERC,
    PUT_ASIDE,
    SELL_AT_LAST_BUY,
    SL,
    TAKER_FEE_RATE,
    TP,
    isMarket,
    rf,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";

import {
    ceil,
    findAve,
    getCoinPrecision,
    getMaxAmt,
    getMaxSz,
    getMinSz,
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
        useFallbackSL = false,
        useTrExitTP = false,
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
        sellFees = 0,
        lastPx = 0;

    let mData: IObj = { data: [] },
        _data: IObj;
    console.log("BEGIN BACKTESTING...\n");
    let entry: number = 0,
        entryLimit: number | null = null,
        exitLimit: number | null = null,
        tp: number | null = null,
        base: number = 0,
        sl: number | null = null,
        exit: number = 0,
        enterTs = "";

    const pricePrecision = getPricePrecision(pair, platNm);
    const minSz = getMinSz(pair, platNm);
    const maxSz = getMaxSz(pair, platNm);
    const maxAmt = getMaxAmt(pair, platNm);
    const basePrecision = getCoinPrecision(pair, "limit", platNm);
    const quote = pair[1]


    console.log({ minSz, maxSz, pricePrecision, basePrecision });
    balance = toFixed(balance, pricePrecision);
    let START_BAL = balance
    console.log({balance})

    let aside = 0

    const putAside = (amt: number)=>{
        if (!PUT_ASIDE) return
        balance -= amt;
        aside += amt;
        START_BAL = balance;
    }

    let _bool = false

    const _fillSellOrder = (ret: ReturnType<typeof fillSellOrder>) => {
        (pos = ret.pos),
            (mData = ret.mData),
            (sl = ret.sl),
            (tp = ret.tp),
            (entryLimit = ret.entryLimit),
            (cnt = ret.cnt),
            (gain = ret.gain),
            (loss = ret.loss);
        sellFees += ret.fee;
        exitLimit = null;
        entryLimit = null;
        balance += ret.balance
        const profitPerc = (balance - START_BAL) / START_BAL * 100
        if (profitPerc >= 100){
            putAside(balance/2.5)
        }
        _bool = false
    };

    const _fillBuyOrder = (ret: ReturnType<typeof fillBuyOrder>) => {
        (pos = ret.pos),
            (mData = ret.mData),
            (_cnt = ret._cnt);
        buyFees += ret.fee;
        tp = toFixed(entry * (1 + TP / 100), pricePrecision);
        sl = toFixed(entry * (1 - SL / 100), pricePrecision);
        base += ret.base
    };

    async function _fillSell({_exit, _base, _row, isSl} : {_exit: number, _row: ICandle, _base: number, isSl?: boolean}) {
        console.log("\nSELLING", {_base, _exit} ,"\n")

        const _bal = _base * _exit
        if (_bal > maxAmt){
            console.log(`BAL ${_bal} > MAX_AMT ${maxAmt}`)
             _base = (maxAmt * (1 - .5/100)) / _exit
             _base = toFixed(_base, basePrecision)
            return _fillSell({_exit, _base, _row, isSl})

        }
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
        });
        

        _fillSellOrder(ret);
        _cnt = 0;
        base -= _base

        console.log(`\nAFTER SELL: bal = ${balance}, base = ${base}\n`);
    }

    function _fillBuy({amt, _entry, _row} : {amt: number, _entry: number, _row: ICandle}) {
        console.log("\BUYING", {amt, _entry} ,"\n")
        const _base = amt / _entry;
        if (_base < minSz) {
            const msg =  `BASE: ${_base} < MIN_SZ: ${minSz}`
            return console.log(`${msg}`);
        }else if (_base > maxSz){
            const msg = `BASE: ${_base} > MAX_SZ: ${maxSz}`;

            console.log(`${msg}\n`);

            amt =( maxSz * (1 - .5/100)) * _entry
            amt = toFixed(amt, pricePrecision)
            return _fillBuy({amt, _entry, _row})
        }
        _cnt = 0;
        if (!entryLimit) entryLimit = entry;
        const ret = fillBuyOrder({
            entry: _entry,
            prevrow: _row,
            entryLimit,
            enterTs,
            taker,
            balance: amt,
            basePrecision,
            mData: { ...mData },
            pos,
        });
        _fillBuyOrder(ret);
        balance -= amt

        console.log(`\nAFTER BUY: bal = ${balance}, base = ${base}\n`);
        
    }

    for (let i = d + 1; i < df.length; i++) {
        
        
        const prevrow = df[i - 1],
            row = df[i];
 if (minSz == 0 || maxSz == 0 || row.v <= 0
            // || maxReached //|| profitPerc >= 100//9900
            ) continue;
        lastPx = row.o;

        const isGreen = prevrow.c >= prevrow.o
        const isYello = prevrow.c > row.o
        console.log(`\nTS: ${row.ts}`);

        if (pos) _cnt += 1;

        const _sell = !isGreen && prevrow.sma_20 < prevrow.sma_50
        if (!pos && buyCond(prevrow, df, i)) {
            console.log("\nKAYA RA BUY\n");
            enterTs = row.ts;
            console.log(`HAS BUY SIGNAL...`);

            entry = row.o;
            _fillBuy({amt: balance, _row: row, _entry: entry});

            if (!isGreen)
                continue;
        }
        if (pos) {
            enterTs = row.ts;
            const { h, c, ha_c } = prevrow;
            //exitLimit = 3//ha_c * (1 - .5/100);
            const e = false ? Math.max(prevrow.o , prevrow.c) : h
            exitLimit = e * (1 + 3.5/100)
        }

        if (pos && exitLimit) {
            //exitLimit = prevrow.h * (1 + 3.5/100) //Math.max(prevrow.o , prevrow.c) * (1 + 3.5 / 100);

            exit = 0;
            const _row = row;
            console.log("HAS POS");

            let goOn = true,
                isClose = false, isSl = false;

                let SL = .5//.5//1.2;
            const TRAIL = .1 // .1
            const trail = ceil(prevrow.h * (1 - TRAIL / 100), pricePrecision);
            
            const { h, c, o } = _row;
            const _sl = entry * (1 - SL / 100);
            let _tp = Math.max(o, entry) * (1 + 10 / 100);
            _tp = Number(_tp.toFixed(pricePrecision));

            const isO = prevrow.h == Math.max(prevrow.c, prevrow.o) ;
            if (false) {
            } 
           
            exit = Math.max(o, exitLimit)
            
            isSl = _sell
            if (false) {
            }
            else if (o >= trail && isO){
                exit = o
                
                
            }

            _bool = true

           
            
             //|| prevrow.hist < 0
                
            if (exit != 0 && h >= exit && (isSl || exit >= _sl)){

                isSl = exit < entry
                _fillSell({_row, _exit: exit, _base: base, isSl})
            }
        }
    }

   
    const oKeys = Object.keys(mData.data);
    const lastPos = mData.data[oKeys[oKeys.length - 1]];

    if (lastPos && lastPos.side.startsWith("buy")) {
        console.log("ENDED WITH BUY");

        const _row = df[df.length - 1]
        const _exit = SELL_AT_LAST_BUY ? lastPos._c : _row.o;
        _fillSell({_row, _exit, _base: base, isSl: true})
       
    }

    console.log('\n', {balance, aside, base});

    
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss, aside};

    console.log(`\nBUY_FEES: ${quote} ${buyFees}`);
    console.log({ minSz, maxSz, maxAmt });
    
    console.log(`SELL_FEES: ${quote} ${sellFees}\n`);

    return _data;
};
