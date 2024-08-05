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
    sellCond: (row: ICandle, entry: number, df?: ICandle[], i?: number) => boolean;
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
        }: {
            _exit: number;
            _row: ICandle;
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
            _row: ICandle;
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

        /*  if (pos && exitLimit) {
            console.log("HAS POS");

            let goOn = true,
                isSl = false;

            const exitRow = prevRow;

            const {o,h,l,c, ha_c, ha_o, ha_h} = exitRow
     

            if (exitLimit) {
                
                if (exitLimit < h) {
                    console.log("STD HIT");
                    exitLimit *= (1 + 4.5 / 100); // ok
                }
                if (exitLimit < h) {
                    exit = exitLimit;
                } 
                 else {
                    goOn = false;
                    console.log("NEITHER");
                }
                if (goOn) {
                    const p = "EXIT";
                    console.log("\nFILLING SELL ORDER AT", p);
                    _fillSell({_exit: exit, _row: exitRow, _base: base });
                
                }else{
                    
                }

            }
            console.log(`AFTER SELL SEC:`, {pos}, "\n");
        }
 */
        if (pos && exitLimit) {
            let _e = exitLimit;
            const erow = prevRow;
            const { o, h, l, c, ha_o, ha_h, ha_l, ha_c } = erow;
            const _sl = entry * (1 - SL / 100);
            const _tp = entry * (1 + TP / 100);
            let _exit = 0;
            let go = true;
         const _isGreen = df[i - 2].c >=  df[i - 1].o
            const trailingStop = .5
             if (/* _e <= o &&  */h >= (o * (1 + trailingStop/100)) || true){
                _exit = h * (1 - trailingStop/100)
                const _stopFromO = o * (1 - trailingStop / 100)

                if (c > _exit){
                    _exit = c
                }
                if (!_isGreen && l <= _stopFromO){
                    _exit = _stopFromO
                    continue
                
                }
                if (l <= _exit){
                     const _slip = .0//randomNum(.5, .7)
                _exit *= (1 - _slip/100)
                }else {go = false}
               
            }/* else if (prevRow.ha_o >= exitLimit * (1 + 0 / 100)) {
                _exit = row.o;
            } else if (prevRow.h <= _sl) {
                _exit = row.o;
            } else if (Math.min(prevRow.l, prevRow.ha_l) >= _tp && isGreen) {
                _exit = row.o;
            } */
            
            
            /*  else if (h > _e * (1 - .5/100)) {
                _exit = h;
            } */ else {
                go = false;
            }

            if (go) {
                _fillSell({ _exit, _row: erow, _base: base });
            }
        }

        if (!pos && (useAnyBuy || buyCond(prevRow, df, i))) {
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(2)}`
            );
            // Place limit buy order
            entryLimit = isMarket ? row.o : prevRow.ha_o;
            enterTs = row.ts;

            if (entryLimit && isMarket) {
                entry = row.o;
                _fillBuy({ _entry: entry, _row: row, _amt: balance });
            }
        }
        if (pos && sellCond(prevRow, entry, df, i)) {
            const rf = true;
            exitLimit = prevRow.ha_c/* rf
                ? Math.max(prevRow.sma_50, prevRow.sma_20, prevRow.ha_c)
                : Math.min(prevRow.ha_c, prevRow.ha_o); */
            const perc = .5//.5; //.15// rf ? 1.3 : 0;
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
