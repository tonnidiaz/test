import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    MAKER_FEE_RATE,
    PUT_ASIDE,
    SELL_AT_LAST_BUY,
    SL,
    TAKER_FEE_RATE,
    TP,
    isMarket,
    rf,
    useAnyBuy,
    useSwindLow,
} from "@/utils/constants";

import {
    ceil,
    findAve,
    getCoinPrecision,
    getMaxAmt,
    getMaxSz,
    getMinSz,
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
    platNm: string;
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
    console.log("BEGIN BACKTESTING...\n");
    let entry: number = 0,
        entryLimit: number | null = null,
        exitLimit: number | null = null,
        tp: number | null = null,
        base: number = 0,
        sl: number | null = null,
        exit: number = 0,
        enterTs = "";

    const pricePrecision = getPricePrecision(pair, platNm);
    const minSz = getMinSz(pair, platNm);
    const maxSz = getMaxSz(pair, platNm);
    const maxAmt = getMaxAmt(pair, platNm);
    const basePrecision = getCoinPrecision(pair, "limit", platNm);
    const quote = pair[1]


    console.log({ minSz, maxSz, pricePrecision, basePrecision });
    let START_BAL = balance
    console.log({balance})

    let aside = 0

    const putAside = (amt: number)=>{
        if (!PUT_ASIDE) return
        balance -= amt;
        aside += amt;
        START_BAL = balance;
    }

    let _bool = false
    let buyRow = df[0]
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
        _bool = false
    };

    const _fillBuyOrder = (ret: ReturnType<typeof fillBuyOrder>) => {
        if (maxSz == null  || minSz == null  || pricePrecision == null  || basePrecision == null) return
        (pos = ret.pos),
            (mData = ret.mData),
            (_cnt = ret._cnt);
        buyFees += ret.fee;
        tp = toFixed(entry * (1 + TP / 100), pricePrecision!);
        sl = toFixed(entry * (1 - SL / 100), pricePrecision!);
        base += ret.base
    };

    async function _fillSell({_exit, _base, _row, isSl} : {_exit: number, _row: ICandle, _base: number, isSl?: boolean}) {
        console.log("\nSELLING", {_base, _exit} ,"\n")
        if (maxSz == null  || minSz == null  || pricePrecision == null  || basePrecision == null) return

        const _bal = _base * _exit
        if (_bal > maxAmt!){
            console.log(`BAL ${_bal} > MAX_AMT ${maxAmt}`)
             _base = (maxAmt! * (1 - .5/100)) / _exit
             _base = toFixed(_base, basePrecision!)
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
        _cnt = 0;
        base -= _base

        console.log(`\nAFTER SELL: bal = ${balance}, base = ${base}\n`);
    }

    function _fillBuy({amt, _entry, _row} : {amt: number, _entry: number, _row: ICandle}) {
        console.log("\BUYING", {amt, _entry} ,"\n")
        if (maxSz == null  || minSz == null  || pricePrecision == null  || basePrecision == null) return
        const _base = amt / _entry;
        if (_base < minSz) {
            const msg =  `BASE: ${_base} < MIN_SZ: ${minSz}`
            return console.log(`${msg}`);
        }else if (_base > maxSz!){
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
        buyRow = _row
        
    }

    for (let i = d + 1; i < df.length; i++) {
        
        
        const prevrow = df[i - 1],
            row = df[i];

 if (maxSz == null  || minSz == null  || pricePrecision == null  || basePrecision == null || row.v <= 0
            // || maxReached //|| profitPerc >= 100//9900
            ) continue;
        lastPx = row.o;

        const isGreen = prevrow.c >= prevrow.o
        const isYello = prevrow.c > row.o
        console.log(`\nTS: ${row.ts}`);
        console.log({ts: row.ts, o: row.o, h: row.h, l: row.l, c: row.c, v: row.v})

        if (!pos && entryLimit) {
            const _row = prevrow;
            console.log("HAS NO POS");

            let goOn = true,
                isSl = false;

            if (_row.l < entryLimit) {
                entry = entryLimit;
            } else {
                goOn = false;
                console.log("NEITHER");
            }
            if (goOn) {
                const p = "EXIT";
                console.log("\nFILLING BUY ORDER AT", p);
                _fillBuy({_entry: entry, _row, amt: balance});
                //continue
            }
        } else if (pos && exitLimit) {
        }

        if (!pos && (useAnyBuy || buyCond(prevrow, df, i)) && row.v > 0) {
            console.log("\nKAYA RA BUY\n");
            // Place limit buy order
            entryLimit = prevrow.c * (1 - 2.5 / 100);
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(2)}`
            );
            if (entryLimit && isMarket) {
                entry = row.o;
                _fillBuy({_entry: entry, _row: row, amt: balance});
            }
        } else if (pos) {
            exit = 0;
            const _row = row;
            console.log("HAS POS");

            let goOn = true,
                isSl = false,
                is_curr = false;

            const { h, l, c, o, ha_o, ha_h, ha_l, ha_c } = _row;

            const SL = 0.15,
                TP = 1.5;
            const _sl = o * (1 - SL / 100); //.25

            const _prev_sl = prevrow.o * (1 - SL / 100);
            const _prev_tp = prevrow.o * (1 + TP / 100);

            let _tp = o * (1 + TP / 100); //3.5
            const calcSl = () => ceil(entry * (1 - 0.05 / 100), pricePrecision);
            sl = calcSl();

            if (false) {
            }  else if (h >= _tp) {
                const tp2 = _tp * (1 + 0.5 / 100); //1.5
                if (h >= tp2) {
                    exit = tp2;
                }
            }

            else if (l <= _sl && _sl < h && l >= _sl * (1 - 5.5/100) && !isGreen ) {
                const px = i % 2 == 0? l : _sl
                exit = px;
                _fillSell({_exit: exit, _row, isSl: true, _base: base});

                entry = px;
                _fillBuy({_entry: entry, _row, amt: balance });
                if (h >= _tp) {
                    exit = _tp;
                } else if (c > o) {
                    exit = c;
                }
            }

            goOn = exit != 0;
            if (exit == 0) {
                console.log("NEITHER");
                goOn = false;
            }
            sl = calcSl();

            exitLimit = o;

            if (goOn && pos && exit <= h && exit >= sl) {
                const p = "EXIT";
                console.log("\nFILLING SELL ORDER AT", p);
                _fillSell({_exit: exit, _row, isSl, _base: base});
                console.log({ is_curr });
            }
        }
    }
    const oKeys = Object.keys(mData.data);
    const lastPos = mData.data[oKeys[oKeys.length - 1]];

    if (lastPos && lastPos.side.startsWith("buy")) {
        console.log("ENDED WITH BUY");
        const _row = SELL_AT_LAST_BUY ? buyRow : df[df.length - 1]
        const _exit = SELL_AT_LAST_BUY ? lastPos._c : _row.o;
        _fillSell({_row, _exit, _base: base, isSl: true})
       
    }

    console.log('\n', {balance, aside, base});

    
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss, aside};

    console.log(`\nBUY_FEES: ${quote} ${buyFees}`);
    console.log({ minSz, maxSz, maxAmt });
    
    console.log(`SELL_FEES: ${quote} ${sellFees}\n`);
    return _data;
};
