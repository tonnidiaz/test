import { fillBuyOrder, fillSellOrder } from "../utils/functions";
import {
    MAKER_FEE_RATE,
    SL,
    TAKER_FEE_RATE,
    TP,
    TRAILING_STOP_PERC,
    WCS1,
    isMarket,
    rf,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";

import {
    ceil,
    findAve,
    getCoinPrecision,
    getPricePrecision,
    randomNum,
    toFixed,
} from "@/utils/functions";
import { IObj, ICandle } from "@/utils/interfaces";
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

        function _fillBuy(_entry: number, _row: ICandle) {
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

        const isGreen = prevRow.c >= prevRow.o,
            isSom = prevRow.c > row.o;
        if (pos) {
            exit = 0;
            const _row = row;
            console.log("HAS POS");
            let isSl = false;

            const { h, o, c, l } = _row;

            let SL = 0.2;
            tp = ceil(o * (1 + 10 / 100), pricePrecision);
            const trail = ceil(
                h * (1 - TRAILING_STOP_PERC / 100),
                pricePrecision
            );
            exit = tp;
            if (h >= tp) {
                exit = tp;
            } else if (c >= trail) {
                exit = c;
                SL *= 2;
            }
            sl = ceil(entry * (1 - SL / 100), pricePrecision);

            if (exit != 0 && exit <= h && exit >= sl) {
                _fillSell(exit, _row, isSl);
            }

            continue;
        }

        if (!pos && buyCond(prevRow, df, i)) {
            console.log("\nKAYA RA BUY\n");
            // Place limit buy order
            entryLimit = row.o;
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t MARKET buy order at ${entryLimit?.toFixed(
                    pricePrecision
                )}`
            );
            if (entryLimit && isMarket) {
                entry = row.o
                _fillBuy(entry, row);
               
            }
             continue;
        }
        

        if (pos) {
            console.log("\nKAYA RA SELL");
            const _row = row;
            const { o, h, c } = _row;

            let SL = 0.5;
            tp = ceil(o * (1 + 3.5 / 100), pricePrecision);
            const trail = ceil(
                h * (1 - TRAILING_STOP_PERC / 100),
                pricePrecision
            );
            exit = tp;
            if (h >= tp) {
                exit = tp;
            } else if (c >= trail) {
                exit = c;
                SL *= 2.5;
            }

            sl = ceil(entry * (1 - SL / 100), pricePrecision);
            if (exit != 0 && exit <= h && exit >= sl) {
                _fillSell(exit, _row);
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
