"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = void 0;
const functions_1 = require("./utils/functions");
const constants_1 = require("@/utils/constants");
const functions_2 = require("@/utils/functions");
const funcs_test_fallback_sl_1 = require("./funcs-test-fallback-sl");
const tr_exit_tp_1 = require("./fb/tr-exit-tp");
let _cnt = 0;
const d = constants_1.useSwindLow ? 20 : 0;
const strategy = ({ df, balance, buyCond, sellCond, lev = 1, pair, maker = constants_1.MAKER_FEE_RATE, taker = constants_1.TAKER_FEE_RATE, trades, platNm, }) => {
    const useFallbackSL = false, useTrExitTP = false;
    if (useTrExitTP) {
        return (0, tr_exit_tp_1.strategy)({
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
        return (0, funcs_test_fallback_sl_1.strategy)({
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
        if (pos)
            _cnt += 1;
        if (!pos && buyCond(prevrow, df, i)) {
            console.log("\nKAYA RA BUY\n");
            enterTs = row.ts;
            console.log(`HAS BUY SIGNAL...`);
            entry = row.o;
            _fillBuy({ amt: balance, _row: row, _entry: entry });
            if (!isGreen)
                continue;
        }
        if (pos) {
            enterTs = row.ts;
            const { h, c, ha_c } = prevrow;
            //exitLimit = 3//ha_c * (1 - .5/100);
            const e = false ? Math.max(prevrow.o, prevrow.c) : h;
            exitLimit = e * (1 + 3.5 / 100);
        }
        if (pos && exitLimit) {
            //exitLimit = prevrow.h * (1 + 3.5/100) //Math.max(prevrow.o , prevrow.c) * (1 + 3.5 / 100);
            const _sell = !isGreen && prevrow.sma_20 < prevrow.sma_50;
            exit = 0;
            const _row = row;
            console.log("HAS POS");
            let goOn = true, isClose = false, isSl = false;
            let SL = .5; //.5//1.2;
            const TRAIL = .1; // .1
            const trail = (0, functions_2.ceil)(prevrow.h * (1 - TRAIL / 100), pricePrecision);
            const { h, c, o } = _row;
            const _sl = entry * (1 - SL / 100);
            let _tp = Math.max(o, entry) * (1 + 10 / 100);
            _tp = Number(_tp.toFixed(pricePrecision));
            const isO = prevrow.h == Math.max(prevrow.c, prevrow.o);
            if (false) {
            }
            exit = Math.max(o, exitLimit);
            isSl = _sell;
            console.log({ prevrow });
            console.log({ isSl, exit, trail, _sl });
            if (false) {
            }
            else if (o >= trail && isO) {
                exit = o;
            }
            _bool = true;
            //|| prevrow.hist < 0
            if (exit != 0 && h >= exit && (isSl || exit >= _sl)) {
                isSl = exit < entry;
                _fillSell({ _row, _exit: exit, _base: base, isSl });
            }
        }
    }
    const oKeys = Object.keys(mData.data);
    const lastPos = mData.data[oKeys[oKeys.length - 1]];
    if (lastPos && lastPos.side.startsWith("buy")) {
        console.log("ENDED WITH BUY");
        const _row = constants_1.SELL_AT_LAST_BUY ? buyRow : df[df.length - 1];
        const _exit = constants_1.SELL_AT_LAST_BUY ? lastPos._c : _row.o;
        _fillSell({ _row, _exit, _base: base, isSl: true });
    }
    console.log('\n', { balance, aside, base });
    gain = Number(((gain / cnt) * 100).toFixed(2));
    loss = Number(((loss / cnt) * 100).toFixed(2));
    _data = { ...mData, balance, trades: cnt, gain, loss, aside };
    console.log(`\nBUY_FEES: ${quote} ${buyFees}`);
    console.log({ minSz, maxSz, maxAmt });
    console.log(`SELL_FEES: ${quote} ${sellFees}\n`);
    return _data;
};
exports.strategy = strategy;
