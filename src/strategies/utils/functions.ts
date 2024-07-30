import { isStopOrder, noFees } from "@/utils/constants";
import { toFixed } from "@/utils/functions";
import { IObj } from "@/utils/interfaces";
import BigNumber from 'bignumber.js'

export function fillBuyOrder({
    entry,
    prevRow,
    taker,
    enterTs,
    balance,
    mData,
    entryLimit,
    basePrecision,
    pos,
    isA = true
}: {
    entry: number;
    prevRow: any;
    taker: number;
    enterTs: string;
    balance: number;
    basePrecision: number;
    mData: IObj;
    entryLimit: number;
    pos: boolean;
    isA?: boolean
}) {
    console.log('\nFILL BUY ORDER', {entry, balance});
    const _balance = new BigNumber(balance)
    
    let base : number | BigNumber = _balance.dividedBy(entry)// * (1 - taker);
    const fee = base.multipliedBy(taker)
    console.log("BASE:")
    console.log(`B4 FEE: ${base.toString()}`)
    if (!noFees)
        {
           base = base.minus(fee) //base -= fee
            
        }

    console.log(`AFTER FEE: ${base}\n`)
    //console.log({balance, base, entry, taker, basePrecision});
    base = toFixed(base.toNumber(), basePrecision);
    //console.log(`BASE: ${base}`);

    const data = { ...mData };
    const ts = prevRow.ts;
    const part = isA ? "A" : "B"

    data.data.push({
        side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
        fill: entryLimit,
        base,
        enterTs,
        ts,
        c: `[${part}] ${entry}`,
        _c: entry,
        balance: `[${balance}] \t ${base} \t fee: ${fee}`,
    })
    pos = true;
    return { pos, base, mData: data, _cnt: 0, fee: fee.toNumber() * entry };
}
export const fillSellOrder = ({
    prevRow,
    exit,
    exitLimit,
    base,
    enterTs,
    pricePrecision,
    mData,
    entry,
    cnt,
    gain,
    loss,
    sl,
    tp,
    pos,
    maker,
    entryLimit,
    isSl = false,
    isA = true,
    o
}: {
    exitLimit: number | null;
    exit: number;
    prevRow: IObj;
    base: number;
    enterTs: string;
    pricePrecision: number;
    mData: IObj;
    entry: number;
    cnt: number;
    loss: number;
    gain: number;
    maker: number;
    sl: number | null;
    tp: number | null;
    entryLimit: number | null;
    pos: boolean;
    isSl?: boolean;
    isA?: boolean;
    o?: number
}) => {

    const _isTp = !isStopOrder ? exit >= entry : !isSl
    console.log({ exitLimit, exit, entry, base });
    //console.log(`MIKA: ${exit >= entry ? "gain" : "loss"}`);
    console.log("\nFILL SELL ORDER", {exit, base});

    let _base = new BigNumber(base)
    let balance : number | BigNumber = _base.multipliedBy(exit) 
    console.log("BALANCE")
    const fee = balance.multipliedBy(maker)
    console.log(`B4 FEE: ${balance}`)
    if (!noFees)
        {balance = balance.minus(fee)}

    balance = toFixed(balance.toNumber(), ( pricePrecision));
    console.log(`AFTER FEE: ${balance}\n`)
    const ts = prevRow["ts"];
    
    const _entry = o ?? entry
    const perc = ((exit - _entry)/_entry * 100).toFixed(2)
    const part = isA ? "A" : "B"
    mData["data"].push({
        side: `sell \t {h:${prevRow.h}, l: ${prevRow.l}}`,
        fill: exitLimit,
        enterTs,
        ts,
        c: `[${part}] ${!_isTp ? 'SL' : 'TP'}: ${exit}`,
        _c: exit,
        balance: `[${base}] \t ${balance} { ${perc}% } fee: ${fee}`,
    });
    /* Position now filled */
    base = 0;
    exitLimit = null;

    /* ADD FUNDS BACK TO PORTFOLIO */

    //balance += _bal;
    if (_isTp) gain += 1;
    else loss += 1;
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
