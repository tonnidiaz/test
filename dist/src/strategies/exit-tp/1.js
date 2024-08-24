"use strict";
/**
 * 2024 [73] [PEPE-USDT] [ANY]: 	USDT 10,030.50
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = void 0;
const functions_1 = require("../utils/functions");
const constants_1 = require("@/utils/constants");
const functions_2 = require("@/utils/functions");
let _cnt = 0;
const d = constants_1.useSwindLow ? 20 : 0;
const strategy = ({ df, balance, buyCond, sellCond, lev = 1, pair, maker = constants_1.MAKER_FEE_RATE, taker = constants_1.TAKER_FEE_RATE, trades, platNm, }) => {
    let pos = false;
    let cnt = 0, gain = 0, loss = 0, buyFees = 0, sellFees = 0, lastPx = 0;
    let mData = { data: [] }, _data;
    console.log("BEGIN BACKTESTING...\n");
    let entry = 0, entryLimit = null, exitLimit = null, tp = null, base = 0, sl = null, exit = 0, enterTs = "";
    const pricePrecision = (0, functions_2.getPricePrecision)(pair, platNm);
    const minSz = (0, functions_2.getMinSz)(pair, platNm);
    const maxSz = (0, functions_2.getMaxSz)(pair, platNm);
    const maxAmt = (0, functions_2.getMaxAmt)(pair, platNm);
    const basePrecision = (0, functions_2.getCoinPrecision)(pair, "limit", platNm);
    const quote = pair[1];
    console.log({ minSz, maxSz, pricePrecision, basePrecision });
    let START_BAL = balance;
    console.log({ balance });
    let aside = 0;
    const putAside = (amt) => {
        if (!constants_1.PUT_ASIDE)
            return;
        balance -= amt;
        aside += amt;
        START_BAL = balance;
    };
    let _bool = false;
    let buyRow = df[0];
    const _fillSellOrder = (ret) => {
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
        balance += ret.balance;
        const profitPerc = (balance - START_BAL) / START_BAL * 100;
        if (profitPerc >= 100) {
            putAside(balance / 2.5);
        }
        _bool = false;
    };
    const _fillBuyOrder = (ret) => {
        if (maxSz == null || minSz == null || pricePrecision == null || basePrecision == null)
            return;
        (pos = ret.pos),
            (mData = ret.mData),
            (_cnt = ret._cnt);
        buyFees += ret.fee;
        tp = (0, functions_2.toFixed)(entry * (1 + constants_1.TP / 100), pricePrecision);
        sl = (0, functions_2.toFixed)(entry * (1 - constants_1.SL / 100), pricePrecision);
        base += ret.base;
    };
    async function _fillSell({ _exit, _base, _row, isSl }) {
        console.log("\nSELLING", { _base, _exit }, "\n");
        if (maxSz == null || minSz == null || pricePrecision == null || basePrecision == null)
            return;
        const _bal = _base * _exit;
        if (_bal > maxAmt) {
            console.log(`BAL ${_bal} > MAX_AMT ${maxAmt}`);
            _base = (maxAmt * (1 - .5 / 100)) / _exit;
            _base = (0, functions_2.toFixed)(_base, basePrecision);
            return _fillSell({ _exit, _base, _row, isSl });
        }
        const ret = (0, functions_1.fillSellOrder)({
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
        base -= _base;
        console.log(`\nAFTER SELL: bal = ${balance}, base = ${base}\n`);
    }
    function _fillBuy({ amt, _entry, _row }) {
        console.log("\BUYING", { amt, _entry }, "\n");
        if (maxSz == null || minSz == null || pricePrecision == null || basePrecision == null)
            return;
        const _base = amt / _entry;
        if (_base < minSz) {
            const msg = `BASE: ${_base} < MIN_SZ: ${minSz}`;
            return console.log(`${msg}`);
        }
        else if (_base > maxSz) {
            const msg = `BASE: ${_base} > MAX_SZ: ${maxSz}`;
            console.log(`${msg}\n`);
            amt = (maxSz * (1 - .5 / 100)) * _entry;
            amt = (0, functions_2.toFixed)(amt, pricePrecision);
            return _fillBuy({ amt, _entry, _row });
        }
        _cnt = 0;
        if (!entryLimit)
            entryLimit = entry;
        const ret = (0, functions_1.fillBuyOrder)({
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
        balance -= amt;
        console.log(`\nAFTER BUY: bal = ${balance}, base = ${base}\n`);
        buyRow = _row;
    }
    for (let i = d + 1; i < df.length; i++) {
        const prevrow = df[i - 1], row = df[i];
        if (maxSz == null || minSz == null || pricePrecision == null || basePrecision == null || row.v <= 0
        // || maxReached //|| profitPerc >= 100//9900
        )
            continue;
        lastPx = row.o;
        const isGreen = prevrow.c >= prevrow.o;
        const isYello = prevrow.c > row.o;
        console.log(`\nTS: ${row.ts}`);
        console.log({ ts: row.ts, o: row.o, h: row.h, l: row.l, c: row.c, v: row.v });
        if (!pos && buyCond(prevrow)) {
            /* BUY SEC */
            entryLimit = constants_1.isMarket ? row.o : prevrow.ha_o;
            enterTs = row.ts;
            if (entryLimit && constants_1.isMarket) {
                entry = row.o;
                console.log(`[ ${row.ts} ] \t MARKET buy order at ${entry?.toFixed(pricePrecision)}`);
                _fillBuy({ _entry: entry, _row: row, amt: balance });
            }
        }
        if (pos && !exitLimit) {
            /* SELL SECTION */
            exitLimit = prevrow.h;
            enterTs = row.ts;
            console.log(`[ ${row.ts} ] \t Limit sell order at ${exitLimit}`);
        }
        if (pos && exitLimit) {
            const _row = row;
            const { o, h, l, c, ha_h } = _row;
            let isClose = false;
            let tp = Number((o * (1 + constants_1.TP / 100)).toFixed(pricePrecision));
            const sl = Number((entry * (1 - constants_1.SL / 100)).toFixed(pricePrecision));
            const stop = Number((h * (1 - constants_1.TRAILING_STOP_PERC / 100)).toFixed(pricePrecision));
            let _exit;
            if (c >= h && c >= exitLimit * (1 - 0 / 100)) {
                _exit = c;
                isClose = true;
            }
            else if (tp >= sl && h >= tp && c > o) {
                _exit = c;
                isClose = true;
            }
            if (_exit && _exit <= h) {
                exit = isClose ? c : _exit;
                _fillSell({ _exit, _row, _base: base });
            }
        }
    }
    if (base != 0) {
        console.log("ENDED WITH BUY");
        let _bal = lastPx * base;
        _bal *= 1 - taker;
        balance += _bal;
    }
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss };
    console.log(`\nBUY_FEES: ${pair[1]} ${buyFees}`);
    console.log(`SELL_FEES: ${pair[1]} ${sellFees}\n`);
    return _data;
};
exports.strategy = strategy;
