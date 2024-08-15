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
    let balA = balance * (1 - 10 / 100);
    let balB = balance - balA;
    balance = 0;
    base = 0;
    let baseA = 0,
        baseB = 0;
let filled = false

    for (let i = d + 1; i < df.length; i++) {
        //if (balance < 10) continue;
        const prevrow = df[i - 1],
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
                (tp = ret.tp),
                (entryLimit = ret.entryLimit),
                (cnt = ret.cnt),
                (gain = ret.gain),
                (loss = ret.loss);
            sellFees += ret.fee;
            exitLimit = null;
            entryLimit = null;
            if (isA) balA += ret.balance;
            else balB += ret.balance;
            console.log({ retBal: ret.balance, isA });
        };
        const _fillBuyOrder = (
            ret: ReturnType<typeof fillBuyOrder>,
            isA: boolean
        ) => {
            (pos = ret.pos), (mData = ret.mData), (_cnt = ret._cnt);
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
            _row: ICandle;
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
                isA,
                isSl,
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
            _row: ICandle;
        }) {
            if (amt == 0) return;
            if (!entryLimit) entryLimit = amt;
            if (isA) balA -= amt;
            else balB -= amt;

            const ret = fillBuyOrder({
                entry: _entry,
                prevrow: _row,
                entryLimit,
                enterTs,
                taker,
                balance: amt, //: _bal,
                basePrecision,
                mData: { ...mData },
                pos,
                isA,
            });
            _fillBuyOrder(ret, isA);
        }

        const isGreen = prevrow.c >= prevrow.o;
        if (pos && exitLimit) {
            const isA = balA == 0 && baseA != 0,
                isB = balB == 0 && baseB != 0;
            const _row = row;
            const _exitLimit = exitLimit;
            const e = exitLimit;
            //_fillBuy(row.o, balance)
            console.log("HAS POS");
            const { o, h, l, c } = _row;
            let goOn = true,
                isSl = false;

            const tp = o * (1 + .5/100)
            const sl = o * (1 - 1.5/100)

           // const _do = prevrow.c >= prevrow.o;
           exit =  c//h > o * (1 + .15/100) && c < o * (1 - .05/100) ? o : c;
            if (exitLimit < _row.h) {
                exit = exitLimit;
            } else {
                goOn = false;
                console.log("NEITHER");
            }

            if (true) {
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
            if (!filled && goOn) {
                filled = true
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
                        _row: _row,
                        isSl,
                    });

                    pos = true;
                } else if (isB) {
                    console.log("\nSELL B");
                    _fillSell({
                        _exit: exit,
                        _base: baseB,
                        isA: false,
                        _row: _row,
                        isSl,
                    });

                    pos = true;
                }

                //continue
            } else if (c >= sl) {
                filled = true
                console.log(
                    "\nAFTER_THAT:",
                    { pos, isA, isB, baseA, baseB, balA, balB },
                    "\n"
                );

                if (isA) {
                    _fillSell({
                        _exit: exit,
                        _base: baseB,
                        isA: false,
                        _row: _row,
                        isSl,
                    });
                    pos = true;
                } else if (isB) {
                    _fillSell({
                        _exit: exit,
                        _base: baseA,
                        isA: true,
                        _row: _row,
                        isSl,
                    });
                    pos = true;
                }
                if (pos) {
                    exitLimit = _exitLimit// * (1 - .5/100);
                }
            }
            continue;
        }

        if (!pos && buyCond(prevrow, df, i)) {
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
                console.log({ balA, balB });
                _fillBuy({ _entry: entry, amt: balA, _row: row, isA: true });
            }
        } else if (pos && sellCond(prevrow, entry, df, i)) {
            const rf = false;
            exitLimit = rf ? Math.max(prevrow.ha_h, prevrow.h) : row.c;
            const perc = 1; //rf ? 6.5 : 0;
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
