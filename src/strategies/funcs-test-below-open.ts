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
    SELL_AT_LAST_BUY,
} from "@/utils/constants";

import {
    findAve as calcAve,
    getCoinPrecision,
    getMaxAmt,
    getMaxSz,
    getMinSz,
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
    let pos = false;
    let cnt = 0,
        gain = 0,
        loss = 0,
        buyFees = 0,
        sellFees = 0,
        lastPx = 0;

    let mData: IObj = { data: [] },
        _data: IObj;
    console.log("CE_SMA: BEGIN BACKTESTING...\n");
    let entry: number = 0,
        entryLimit: number | null = null,
        exitLimit: number | null = null,
        tp: number | null = null,
        base: number = 0,
        sl: number | null = null,
        enterTs = "";

    const pricePrecision = getPricePrecision(pair, platNm);
    const minSz = getMinSz(pair, platNm);
    const maxSz = getMaxSz(pair, platNm);
    const maxAmt = getMaxAmt(pair, platNm);
    const basePrecision = getCoinPrecision(pair, "limit", platNm);

    console.log({ minSz, maxSz, pricePrecision, basePrecision });
    balance = toFixed(balance, pricePrecision);
    let START_BAL = balance
    //df = df.slice(20);

    console.log(trades);

    const times: { start: string; end: string; cnt: number }[] = [];
    let aside = 0

    const putAside = (amt: number)=>{
        balance -= amt;
        aside += amt;
        START_BAL = balance;
    }


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
        times.push({ start: enterTs, end: _row.ts, cnt: _cnt });
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
        
        if (minSz == 0 || maxSz == 0
            // || maxReached //|| profitPerc >= 100//9900
            ) continue;
        const prevrow = df[i - 1],
            row = df[i];
 
        lastPx = row.o;

        console.log(`\nTS: ${row.ts}`);

        if (pos) _cnt += 1;

        

        console.log({vol: row.v, prev_vol: prevrow.v})

        const isGreen = prevrow.c >= prevrow.o, isSom = prevrow.c > row.o;

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
                _fillBuy({ _entry: entry, _row: row, amt: balance });
                

            }
        }
       

        if (pos) {
            const _row = row;
            const { o, h, l, c } = _row;
            let _exit = 0, exit = 0;
            const trailingStop = .5;
            const SL = 3.5
            let sl = entry * (1 - SL / 100);
            tp = o * (1 + TP / 100);

            sl = Number(sl.toFixed(pricePrecision));
            tp = Number(tp.toFixed(pricePrecision));

            console.log("\nPOS:", { o, h, l, c,  }, "\n");

            const belowOpen = o * (1 - trailingStop / 100);

            // if (tp <= h){
            //     exit = tp
            //     _fillSell({_exit: exit, _base: base, _row})

            //     if (c < o){
            //         entry = c
            //         _fillBuy({_entry: entry, _row, amt: balance})
            //     }
            // }
                
            if (l <= belowOpen && belowOpen < o) {
                console.log("SELLING AT BELOW OPEN");
                
                exit = belowOpen
                _exit = exit;

                _fillSell({ _exit, _row: _row, _base: base });
                if ( !pos && c > o) {
                    console.log("\nRE-BUYING AT OPEN\n");
                    entry = o;
                    _fillBuy({ amt: balance, _entry: entry, _row: _row });
                  
                }
                // else if (c < o && !pos) {
                //     console.log("\nRE-BUYING AT OPEN\n");
                //     entry = c;
                //     _fillBuy({ amt: balance, _entry: entry, _row: _row });
                  
                // }
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
        times.push({
            start: enterTs,
            end: "Incomplete: " + df[df.length - 1].ts,
            cnt: _cnt,
        });
    }

    console.log('\n', {balance, aside, base});

    const quote = pair[1]
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss, aside: quote == 'ETH' ? aside * 2000 : aside };

    console.log(`\nBUY_FEES: ${quote} ${buyFees}`);
    console.log({ minSz, maxSz, maxAmt });
    
    console.log(`SELL_FEES: ${quote} ${sellFees}\n`);
    return _data;
};
