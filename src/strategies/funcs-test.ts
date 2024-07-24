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
import { IObj } from "@/utils/interfaces";
import { strategy as strExp } from "./funcs-test-eFromH";
import { strategy as strBillo } from "./funcs-test-billo";
import { strategy as strSLTP } from "./funcs-test-billo";
import { strategy as strTrailing } from "./funcs-test-trailing";
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
    const useExp = false,
        useTrailing = true,
        useBillo = false,
        useSLTP = false;

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
    const greenAves: number[] = [];
    const redAves: number[] = [];

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
            });
            _fillBuyOrder(ret);
        }

        const isGreen = prevRow.c >= prevRow.o;
        const isSum = prevRow.c > row.o;

        if (!pos && entryLimit) {
            const entryRow = prevRow;
            console.log("HAS NO POS");

            let goOn = true,
                isSl = false;

            if (entryRow.l < entryLimit) {
                entry = entryLimit;
            } else {
                goOn = false;
                console.log("NEITHER");
            }
            if (goOn) {
                const p = "EXIT";
                console.log("\nFILLING BUY ORDER AT", p);
                _fillBuy(entry, entryRow);
                //continue
            }
        } else if (pos && exitLimit) {
            const exitRow = prevRow;
            console.log("HAS POS");

            let goOn = true,
                isSl = false,
                is_curr = false;
            const _sl = entry * (1 - SL / 100);
            const _tp = entry * (1 + TP / 100);

            if (false) {
            } else if (exitLimit <= prevRow.h) {
                exit = exitLimit * (1 + 0 / 100);
                is_curr = true;
            } else if (prevRow.ha_o >= exitLimit * (1 + 0 / 100)) {
                exit = row.o;
            } else if (prevRow.h <= _sl) {
                exit = row.o;
            } else if (Math.min(prevRow.l, prevRow.ha_l) >= _tp && isGreen) {
                exit = row.o;
            } else {
                console.log("NEITHER");
                goOn = false;
            }

            /*  const tpCond = pos && tp && prevRow.h >= tp, slCond = pos && sl && sl <= entry && prevRow.l <= sl  && prevRow.h > sl

                if (tp && sl){
                   if (!isGreen) {
                    if (tpCond) exit  = tp
                    else if (slCond) exit = sl
                    else {goOn = false}
                }else{
                    if (slCond) exit = sl
                    
                    else if (tpCond) exit  = tp
                    else {goOn = false}
                } 
                 if (goOn){
                    _fillSell(exit, row)
                }
                } */

            if (goOn) {
                const p = "EXIT";
                console.log("\nFILLING SELL ORDER AT", p);
                _fillSell(exit, exitRow, isSl);
                console.log({ is_curr });
                if (is_curr) {
                    console.log("FILL BUY");
                    //entryLimit =prevRow.c * (1-1.5/100)
                    //_fillBuy(entry, row)
                    //   i += 5
                    //continue
                    // _fillSell()
                    //exitLimit = row.o * (1 + 1.5/100)
                    /* if (row.c <= row.o || row.c < row.o * (1 + .05/100)){
                        entry = row.c
                        _fillBuy(entry, row)
                    }
                    
                    else continue */
                }
            }
        }

        if (!pos && (useAnyBuy || buyCond(prevRow, df, i))) {
            console.log("\nKAYA RA BUY\n");
            // Place limit buy order
            entryLimit = prevRow.c * (1 - 2.5 / 100);
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(2)}`
            );
            if (entryLimit && isMarket) {
                entry = row.o;
                _fillBuy(entry, row);
            }
        } else if (pos && sellCond(prevRow, entry, df, i)) {
            const _data = {
                greenAve: 1.5825079162609252,
                redAve: 1.593068389674336,
                green_max: 7.882519913106428,
                green_min: -7.151344903220851,
                red_max: 18.78912783751492,
                red_min: -14.144885258654233,
            };
            const rf = true;
            const p = isGreen ? 0.11 : 0.06;
            exitLimit = row.o; //row.o * (1 + p * 3.5 /100)// Math.max(entry, row.o, prevRow.c) * (1 - p / 100);
            const ave = ((row.c * (1 + 1.5 / 100) - row.o) / row.o) * 100;

            const t1 = Math.max(prevRow.h, prevRow.l);
            const t2 = Math.min(prevRow.h, prevRow.l);

            const perc = ((t1 - t2) / t2) * 100; //1.5 // rf ? 1.3 : 2.5;
            if (exitLimit) exitLimit *= 1 + perc / 100;
            //exitLimit = prevRow.ha_c
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);

            console.log({ ave });
            if (isGreen) greenAves.push(ave);
            else redAves.push(ave);
            //console.log("\n",{isGreen, cFromE: ,"\n");
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
    const greenAve = findAve(greenAves);
    const redAve = findAve(redAves);

    console.log(
        "\n",
        {
            greenAve,
            redAve,
            green_max: Math.max(...greenAves),
            green_min: Math.min(...greenAves),
            red_max: Math.max(...redAves),
            red_min: Math.min(...redAves),
        },
        "\n"
    );

    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
