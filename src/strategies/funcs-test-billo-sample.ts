import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    TAKER_FEE_RATE,
    isMarket,
    rf,
    useSwindLow,
} from "@/utils/constants";

import {
    getCoinPrecision,
    getPricePrecision,
    toFixed,
} from "@/utils/functions";
import { IObj } from "@/utils/interfaces";

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
    let balA = balance * (1 - 50/100);
    let balB = balance - balA;
    balance = 0;
    base = 0;
    let baseA = 0,
        baseB = 0;

    for (let i = d + 1; i < df.length; i++) {
        //if (balance < 10) continue;
        const prevRow = df[i - 1], nextRow = df[i+1],
            row = df[i];

        console.log(`\nTS: ${row.ts}`);
        _cnt += 1;

        const _fillSellOrder = (
            ret: ReturnType<typeof fillSellOrder>,
            { _balA, _balB }: { _balA?: number; _balB?: number }
        ) => {
            (pos = ret.pos),
                (mData = ret.mData),
                (sl = ret.sl),
                ///(balance += ret.balance),
                (tp = ret.tp),
                (entryLimit = ret.entryLimit),
                (cnt = ret.cnt),
                (gain = ret.gain),
                //(base -= ret.base),
                (loss = ret.loss);
            sellFees += ret.fee;
            exitLimit = null;
            entryLimit = null;
            if (_balA) balA += ret.balance;
            else if (_balB) balB += ret.balance;
            balance += ret.balance;
            console.log({ retBal: ret.balance, _balA, _balB });
        };
        const _fillBuyOrder = (
            ret: ReturnType<typeof fillBuyOrder>,
            { _balA, _balB }: { _balA?: number; _balB?: number }
        ) => {
            (pos = ret.pos),
                (mData = ret.mData),
                //(balance -= ret.balance),
                (_cnt = ret._cnt);
            enterTs = row.ts;
            buyFees += ret.fee;
            console.log({ retBase: ret.base, _balA, _balB });
            if (_balA) baseA += ret.base;
            else if (_balB) baseB += ret.base;
            console.log({ baseA, baseB });
        };

        async function _fillSell({
            _exit,
            _row,
            isSl,
            _balA,
            _balB,
        }: {
            _exit: number;
            _row: IObj;
            isSl?: boolean;
            _balA?: number;
            _balB?: number;
        }) {
            //base -= amt
            const base = _balA ?? _balB!;
            if (base == 0) return;
            if (_balA) baseA -= base;
            else if (_balB) baseB -= base;

            console.log("AEB:", base);
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
            _fillSellOrder(ret, { _balA, _balB });
            console.log({ balance });
        }

        function _fillBuy({
            _entry,
            _row,
            _balA,
            _balB,
        }: {
            _entry: number;
            _balA?: number;
            _balB?: number;
            _row: IObj;
        }) {
            const balance = _balA ?? _balB!;
            if (balance == 0) return;
            if (!entryLimit) entryLimit = balance;
            if (_balA) balA -= balance;
            else if (_balB) balB -= balance;

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
            _fillBuyOrder(ret, { _balA, _balB });
        }

        const isGreen = prevRow.c >= prevRow.o;
        if (!pos && entryLimit){
            const entryRow = row

            if (entryRow.l <= entryLimit)
               {
                entry = entryLimit
                _fillBuy({_entry: entry, _row: row, _balA: balA})}
        }
        else if (pos && exitLimit) {

            const isA = balB != 0 && baseA != 0, isB = balA != 0 && baseB != 0
            const exitRow = row;
            const _exitLimit= exitLimit
            //_fillBuy(row.o, balance)
            console.log("HAS POS");
            
            let goOn = true,
                isSl = false;

            if (exitLimit < exitRow.h) {
                exit = exitLimit;
            } else {
                goOn = false;
                console.log("NEITHER");
            }

            if (isA){_fillBuy({ _entry: row.o, _balB: balB, _row: row });}
            else if (isB){ _fillBuy({ _entry: row.o, _balA: balA, _row: row });}
            if (goOn) {
                const p = "EXIT";
                console.log("\nFILLING SELL ORDER AT", p, {
                    baseA,
                    balB,
                    balance,
                });
                if (isA) {
                     console.log("\nSELL A");
                    _fillSell({
                        _exit: exit,
                        _balA: baseA,
                        _row: exitRow,
                        isSl,
                    });

                    pos = true
                   
                } else if (isB) {
                    console.log("\nSELL B");
                    _fillSell({
                        _exit: exit,
                        _balB: baseB,
                        _row: exitRow,
                        isSl,
                    });

                    pos = true
                   
                }

                // //continue
            }
            console.log("\nAFTER_THAT:", {pos,isA,isB, baseA, baseB, balA, balB}, "\n");
            const _exit = nextRow?.o || row.c
            
            const isCurrGreen = row.c >= row.o
            if (pos && isA && baseA !=0){
                _fillSell({
                    _exit,
                    _balB: baseB,
                    _row: exitRow,
                    isSl,
                });
                pos = true
            }
            else if (pos && isB && baseB !=0){
                _fillSell({
                    _exit,
                    _balA: baseA,
                    _row: exitRow,
                    isSl,
                });
                pos = true
            }

            if (pos){
                exitLimit = _exitLimit
            }
        }

      
        if (!pos && buyCond(prevRow, df, i)) {
            console.log("KAYA RA BUY");
            if (entryLimit) {
                console.log("BUY ORDER NOT FILLED, RE-CHECKING SIGNALS");
            }
            // Place limit buy order
            entryLimit = row.o;
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(2)}`
            );
            if (entryLimit && isMarket) {
                entry = toFixed(row.o, pricePrecision);
                _fillBuy({ _entry: entry, _balA: balA, _row: row });
            }
        } else if (pos && sellCond(prevRow, entry, df, i)) {
            const rf = true;
            exitLimit = rf ? Math.max(prevRow.ha_h, prevRow.h) : prevRow.ha_h;
            const perc = rf ? 6.5 : 0;
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
        //  balance = lastPos.c * lastPos.base;
        const { c } = lastPos;
        const base = baseA || baseB;
        balance += base * c;
    }
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };

    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log({ balA, balB, baseA, baseB });
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
