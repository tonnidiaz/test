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
import { strategy as strOld} from "./funcs-test-trailing-old";
import { strategy as strOldTest} from "./funcs-test-trailing-old-test";

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
    console.log(df[0]);
    const useOld = false, useOldTest = true;
    if (useOld)
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
    if (useOldTest)
        return strOldTest({
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

    const prAve: number[] = [];
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

        if (!pos && buyCond(prevRow)) {
            /* BUY SEC */

            // Place limit buy order
            entryLimit = isMarket ? row.o : prevRow.ha_o;
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
        }
        if (pos) {
            /* SELL SECTION */
            const rf = true;
            exitLimit = row.o; //entry * (1 + 20 / 100);
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
        }

        if (pos && exitLimit) {
            const erow = row;
            const { o, h, l, c, ha_o, ha_h, ha_l, ha_c } = erow;
            let _exit = 0;
            let go = true,
                isExit = false,
                isClose = false;
            const _isGreen = prevRow.c >= o;
            const trailingStop = TRAILING_STOP_PERC;
            let _sl = entry * (1 - SL / 100);
            let _tp = o * (1 + TP / 100);
            let lFromO = ((o - l) / l) * 100;

            _sl = Number(_sl.toFixed(pricePrecision));
            _tp = Number(_tp.toFixed(pricePrecision));
            lFromO = Number(lFromO.toFixed(pricePrecision));

            console.log("\nPOS:", { o, l, lFromO, trailingStop, c, h }, "\n");

            _exit = h * (1 - trailingStop / 100); // Increase the trailing stop with the price
            const belowOpen = o * (1 - trailingStop / 100);

            if (l <= belowOpen && c > o && belowOpen >= _sl && belowOpen > entry) {
                _exit = belowOpen;
                _fillSell({ _exit, _row: erow, _base: base, o: o });

                    console.log("\nRE-BUYING AT OPEN\n");
                    entry = o;
                    _fillBuy({ _amt: balance, _entry: entry, _row: erow });
                  
                
                continue;
            }else if (l <= belowOpen && c < o && belowOpen >= _sl && _exit < _tp  && belowOpen > entry){
                _exit = belowOpen;
                _fillSell({ _exit, _row: erow, _base: base, o: o });
                entry = c
                _fillBuy({ _amt: balance, _entry: entry, _row: erow });
                continue
            }
            if (c > _exit) {
                // DID NOT GO DOWN TO REACH STOP_PRICE
                console.log("SELLING AT CLOSE");

                _exit = c;
                isClose = true;
                if (c > _tp /* && c > _sl */)
                    _fillSell({ _exit, _row: erow, _base: base, o: o });
                continue;
            } else {
                console.log("SELLING AT STOP");
                isExit = true;
            }

            let _slip = 0;
            _exit *= 1 - _slip / 100;

            if (go && _exit >= _sl) {
                if (_exit > o) {
                    prAve.push(((_exit - o) / o) * 100);
                }
                if (/* isExit && */ _exit >= o && _exit < _tp) {
                    console.log("EXIT LESS THAN TP");
                    continue;
                }

                if (WCS1 && _exit >= o) {
                    _exit = _tp;
                }

                _fillSell({ _exit, _row: erow, _base: base, o: o });
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
    console.log({ profits: calcAve(prAve) });
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
