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
    let balA = balance * (1 - 50 / 100);
    let balB = balance - balA;
    balance = 0;
    base = 0;
    let baseA = 0,
        baseB = 0;

    for (let i = d + 1; i < df.length; i++) {
        //if (balance < 10) continue;
        const prevRow = df[i - 1],
            nextRow = df[i + 1],
            row = df[i];

        console.log(`\nTS: ${row.ts}`);
        _cnt += 1;

        const _fillSellOrder = (
            ret: ReturnType<typeof fillSellOrder>,
            isA: boolean
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
            if (isA) balA += ret.balance;
            else balB += ret.balance;
            //balance += ret.balance;
            console.log({ retBal: ret.balance, isA });
        };
        const _fillBuyOrder = (
            ret: ReturnType<typeof fillBuyOrder>,
            isA: boolean
        ) => {
            (pos = ret.pos),
                (mData = ret.mData),
                //(balance -= ret.balance),
                (_cnt = ret._cnt);
            enterTs = row.ts;
            buyFees += ret.fee;
            console.log({ retBase: ret.base, isA });
            if (isA) baseA += ret.base;
            else baseB += ret.base;
            console.log({ baseA, baseB });
        };

        async function _fillSell({
            _exit,
            _row,
            isSl,
            _base,
            isA,
        }: {
            _exit: number;
            _row: IObj;
            isSl?: boolean;
            _base: number;
            isA: boolean;
        }) {
            //base -= amt
            if (_base == 0) return;
            if (isA) baseA -= _base;
            else baseB -= _base;

            console.log("AEB:", _base);
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
                isA
            });
            _fillSellOrder(ret, isA);
            console.log({ balance });
        }

        function _fillBuy({
            _entry,
            _row,
            isA,
            amt,
        }: {
            _entry: number;
            isA: boolean;
            amt: number;
            _row: IObj;
        }) {
            if (amt == 0) return;
            if (!entryLimit) entryLimit = amt;
            if (isA) balA -= amt;
            else balB -= amt;

            const ret = fillBuyOrder({
                entry: _entry,
                prevRow: _row,
                entryLimit,
                enterTs,
                taker,
                balance: amt, //: _bal,
                basePrecision,
                mData: { ...mData },
                pos,
                isA
            });
            _fillBuyOrder(ret, isA);
        }

        const isGreen = prevRow.c >= prevRow.o;
        if (pos && exitLimit) {
            let isA = balA == 0 && baseA != 0,
                isB = balB == 0 && baseB != 0;
            const exitRow = prevRow;
            const _exitLimit = exitLimit;

            const haHit = exitLimit < exitRow.ha_h
            const stdHit = exitLimit < exitRow.h
            //_fillBuy(row.o, balance)
            console.log("HAS POS", {isA, isB});

        

            isA = balA == 0 && baseA != 0;
                isB = balB == 0 && baseB != 0;
            let goOn = true,
                isSl = false;

              

            if (exitLimit < exitRow.h && row.o <= exitLimit) {
                exit = row.o;
            } else {
                goOn = false;
                console.log("NEITHER");
            }

            if (false) {
                if (isA) {
                    _fillBuy({
                        _entry: row.o,
                        amt: balB,
                        _row: row,
                        isA: false,
                    });
                } else if (isB) {
                    _fillBuy({
                        _entry: row.o,
                        amt: balA,
                        _row: row,
                        isA: true,
                    });
                }
            }
            if (goOn) {
                const p = "EXIT";
                console.log("\nFILLING SELL ORDER AT", p, {
                    baseA,
                    balA,
                    baseB,
                    balB,
                    balance,
                });
                if (isA) {
                    console.log("\nSELL A");
                    _fillSell({
                        _exit: exit,
                        _base: baseA,
                        isA: true,
                        _row: exitRow,
                        isSl,
                    });

                    //pos = true;
                } else if (isB) {
                    console.log("\nSELL B");
                    _fillSell({
                        _exit: exit,
                        _base: baseB,
                        isA: false,
                        _row: exitRow,
                        isSl,
                    });

                   
                }
          //  pos = true;
                //continue
            } else {
                console.log(
                    "\nAFTER_THAT:",
                    { pos, isA, isB, baseA, baseB, balA, balB },
                    "\n"
                );
                const _exit = nextRow?.o || row.c;

               /*  if (isA && baseB != 0 && row.c >= row.o && false) {
                    _fillSell({
                        _exit,
                        _base: baseB,
                        isA: false,
                        _row: exitRow,
                        isSl,
                    });
                    pos = true;
                } else if (isB && baseA != 0 && row.c >= row.o && false) {
                    _fillSell({
                        _exit,
                        _base: baseA,
                        isA: true,
                        _row: exitRow,
                        isSl,
                    });
                    pos = true;
                } */
                if (pos) {
                    exitLimit = _exitLimit;
                }
            } 
        }

        if (!pos && (useAnyBuy || buyCond(prevRow, df, i))) {
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
                let isA = balA != 0 && baseA == 0,
                isB = balB != 0 && baseB == 0;
                console.log({ balA, balB });
                if (isA){
                     _fillBuy({ _entry: entry, amt: balA, _row: row, isA: true });
                }
                else if (isB){
                     _fillBuy({ _entry: entry, amt: balB, _row: row, isA: false });
                }
               
            }
        } else if (pos && sellCond(prevRow, entry, df, i)) {
            const rf = true;
            exitLimit = rf ? Math.max(prevRow.ha_h, prevRow.h) : row.c
            const perc = 1.5; //rf ? 6.5 : 0;
            if (exitLimit) exitLimit *= 1 + perc / 100;

            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
        }

        if (pos && exitLimit) {
        }
    }
    const oKeys = Object.keys(mData.data);
    const lastPos = mData.data[oKeys[oKeys.length - 1]];
    const { _c } = lastPos;

    const _base = baseA || baseB;

    if (baseA) {
        balA = baseA * _c;
    } else if (baseB) {
        balB = baseB * _c;
    }

    balance = balA + balB;
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };

    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log({ balA, balB, baseA, baseB, balance });
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
