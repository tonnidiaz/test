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
import { strategy as strOld } from "./funcs-test-old";
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
        useSLTP = false, useFallbackSL = false;

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

    const pricePrecision = getPricePrecision(pair, "bybit");
    const basePrecision = getCoinPrecision(pair, "limit", "bybit");

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
            exit = 0;
            const exitRow = prevRow;
            console.log("HAS POS");

            let goOn = true,
                isSl = false,
                is_curr = false;

            const { h, l, c, o, ha_o, ha_h, ha_l, ha_c } = prevRow;

            const fast = false;

            const SL = fast ? 0.15 : 1; //1;
            const TP1 = fast ? 1.5 : 3.5; //3.5;
            const TP2 = fast ? 0.5 : 2; //2;

            const _sl = entry * (1 - SL / 100); //.25

            const _tp = o * (1 + TP1 / 100); //3.5
            const _tp2 = _tp * (1 + TP2 / 100); //1.5
            const _tp3 = _tp * (1 - TP2 / 100); //1.5

            if (false) {
            } else if (l <= _sl && h > _sl) {
                if (o <= _sl){
                    exit = h * (1 - .5/100)
                }else{
                  exit =  _sl;
                _fillSell(exit, prevRow, true);
                exit = 0;
                if (c >= o) {
                    entry = o;
                    _fillBuy(entry, prevRow);
                    exit = c;
                    if (c < entry * (1 + TP1 / 100)) continue;
                }  
                }
                
            }/*  else if (o <= _sl && h > _sl) {
                exit = _sl;
            } */
           else if (h >= _tp) {
                exit = row.o;
            } else if (h < _sl) {
                exit = row.o;
            }

            if (exit == 0) {
                console.log("NEITHER");
                goOn = false;
            }

            if (goOn && exit >= _sl) {
                const p = "EXIT";
                console.log("\nFILLING SELL ORDER AT", p);
                _fillSell(exit, exitRow, isSl);
                console.log({ is_curr });
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
        } else if (pos) {
            exitLimit = 1;
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
