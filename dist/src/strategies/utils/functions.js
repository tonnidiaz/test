"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillSellOrder = exports.fillBuyOrder = void 0;
const constants_1 = require("@/utils/constants");
const functions_1 = require("@/utils/functions");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
function fillBuyOrder({ entry, prevrow, taker, enterTs, balance, mData, entryLimit, basePrecision, pos, isA }) {
    console.log('\nFILL BUY ORDER');
    const _balance = new bignumber_js_1.default(balance);
    console.log({ balance, _balance, taker, entry });
    let base = _balance.dividedBy(entry); // * (1 - taker);
    const fee = base.multipliedBy(taker);
    console.log("BASE:");
    console.log(`B4 FEE: ${base.toString()}`);
    if (!constants_1.noFees) {
        base = base.minus(fee); //base -= fee
    }
    console.log(`AFTER FEE: ${base}\n`);
    //console.log({balance, base, entry, taker, basePrecision});
    base = (0, functions_1.toFixed)(base.toNumber(), basePrecision);
    //console.log(`BASE: ${base}`);
    const data = { ...mData };
    const ts = prevrow.ts;
    const part = isA == undefined ? '' : isA ? "[A]" : "[B]";
    data.data.push({
        side: `buy \t {h:${prevrow.h}, l: ${prevrow.l}}`,
        fill: entryLimit,
        base,
        enterTs,
        ts,
        c: `${part} ${entry}`,
        _c: entry,
        balance: `[${balance}] \t ${base} \t fee: ${fee}`,
    });
    pos = true;
    return { pos, base, mData: data, _cnt: 0, fee: fee.toNumber() * entry };
}
exports.fillBuyOrder = fillBuyOrder;
const fillSellOrder = ({ prevrow, exit, exitLimit, base, enterTs, pricePrecision, mData, entry, cnt, gain, loss, sl, tp, pos, maker, entryLimit, isSl, isA, o }) => {
    const _isTp = isSl == undefined ? exit >= entry : !isSl;
    //console.log(`MIKA: ${exit >= entry ? "gain" : "loss"}`);
    console.log("\nFILL SELL ORDER");
    console.log({ maker });
    console.log({ exitLimit, exit, entry, base });
    let _base = new bignumber_js_1.default(base);
    let balance = _base.multipliedBy(exit);
    console.log("BALANCE");
    const fee = balance.multipliedBy(maker);
    console.log(`B4 FEE: ${balance}`);
    if (!constants_1.noFees) {
        balance = balance.minus(fee);
    }
    balance = (0, functions_1.toFixed)(balance.toNumber(), (pricePrecision));
    console.log(`AFTER FEE: ${balance}\n`);
    const ts = prevrow["ts"];
    const _entry = o ?? entry;
    const perc = ((exit - _entry) / _entry * 100).toFixed(2);
    const part = isA == undefined ? '' : isA ? "[A]" : "[B]";
    mData["data"].push({
        side: `sell \t {h:${prevrow.h}, l: ${prevrow.l}}`,
        fill: exitLimit,
        enterTs,
        ts,
        c: `${part} ${!_isTp ? 'SL' : 'TP'}: ${exit}`,
        _c: exit,
        balance: `[${base}] \t ${balance} { ${perc}% } fee: ${fee}`,
    });
    /* Position now filled */
    base = 0;
    exitLimit = null;
    /* ADD FUNDS BACK TO PORTFOLIO */
    //balance += _bal;
    if (_isTp)
        gain += 1;
    else
        loss += 1;
    cnt += 1;
    (entryLimit = null), (tp = null), (sl = null), (pos = false);
    return {
        entryLimit,
        pos,
        balance: balance,
        cnt,
        sl,
        tp,
        gain,
        loss,
        mData,
        fee: fee.toNumber()
        //   _bal,
    };
};
exports.fillSellOrder = fillSellOrder;
