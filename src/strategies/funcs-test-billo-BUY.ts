import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    TAKER_FEE_RATE,
    isMarket,
    rf,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";

import {
    getCoinPrecision,
    getPricePrecision,
    toFixed,
} from "@/utils/functions";
import { IObj, ICandle } from "@/utils/interfaces";

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

    const pricePrecision = getPricePrecision(pair, platNm);
    const basePrecision = getCoinPrecision(pair, "limit", platNm);

    console.log({ pricePrecision, basePrecision });

    balance = toFixed(balance, pricePrecision);
    //df = df.slice(20);

    console.log(trades);

    for (let i = d + 1; i < df.length; i++) {
        //if (balance < 10) continue;
        const prevRow = df[i - 1],
            prePrevRow = df[i - 2],
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
        const _fillBuy = (_entry: number, _row: ICandle) => {
            if (!entryLimit) entryLimit = _entry;
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
        };
        const isGreen = prevRow.c >= prevRow.o;

        if (!pos && entryLimit) {
            console.log("\nNO POS\n");
            let goOn = true;
            // const haDiff = (row.)
            //if (row.ha_l)
            if (row.l <= entryLimit) {
                entry = entryLimit; //!isGreen ? row.c : row.o;
               
            }else if (row.l < entryLimit * (1 + 5.5/100)) {
                entry = row.c
            }else {goOn = false}

            if (goOn){
                 _fillBuy(entry, row);
            }
        }
        if (pos && exitLimit) {
            const exitRow = row;
            console.log("HAS POS");
            const { o, h, l, c } = exitRow;
            const e = exitLimit;
            let goOn = true,
                isSl = false,
                _entry = c;

            if (e < exitRow.h) {
                if (o >= e) {
                    exit = o;
                    _entry = o
                } else {
                    exit = e
                  _entry = e
                }
                //else if ()
            } else {
                goOn = false;
                console.log("NEITHER");
            }
            if (goOn) {

                // const _entry = c < o ? c : exit
                const oc = toFixed(((c - o) / o) * 100, 2);
                const oe = toFixed(((exit - o) / o) * 100, 2);
                console.log("\nFILLING SELL ORDER AT EXIT:", {exit});
                _fillSell(exit, exitRow, isSl);

                pos = false
                entryLimit = o
                if (c <= o){
                    _entry = c
                    _fillBuy(_entry, row)
                }else{
                    _entry = df[i + 1].c
                    i += 1
                    _fillBuy(_entry, row)
                }
              
                
                //continue
            }
        }

        if (
            !pos
         //   && !entryLimit
           && (buyCond(prevRow, df, i))
        ) {
           
            // Place limit buy order
            entryLimit = row.o
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t MARKET buy order at ${entryLimit?.toFixed(2)}`
            );
            if (entryLimit && isMarket) {
                entry = toFixed(row.o, pricePrecision);
                _fillBuy(entry, row);
            }
        } else if (pos && sellCond(row, entry, df, i)) {
            const rf = true;
            exitLimit = rf ? Math.max(prevRow.ha_h, prevRow.h) : prevRow.ha_o;
            const perc = rf ? 1.3 : 10;
            if (exitLimit) exitLimit *= 1 + perc / 100;
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
