import { noFees } from "@/utils/constants";
import { toFixed } from "@/utils/functions";
import { IObj, ICandle } from "@/utils/interfaces";
import BigNumber from 'bignumber.js'

export function fillBuyOrder({
    entry,
    prevrow: row,
    taker,
    enterTs,
    balance,
    mData,
    entryLimit,
    basePrecision,
    pos,
    isA
}: {
    entry: number;
    prevrow: ICandle;
    taker: number;
    enterTs: string;
    balance: number;
    basePrecision: number;
    mData: IObj;
    entryLimit: number;
    pos: boolean;
    isA?: boolean
}) {
    console.log('\nFILL BUY ORDER');
    const _balance = new BigNumber(balance)
    console.log({balance, _balance, taker, entry})
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
    const ts = row.ts;
    const part = isA == undefined ? '' : isA ? "[A]" : "[B]"

    data.data.push({
        side: `buy \t {h:${row.h}, l: ${row.l}, v: ${row.v || 'null'}}`,
        fill: entryLimit,
        base,
        enterTs,
        ts,
        c: `${part} ${entry}`,
        _c: entry,
        balance: `[${balance}] \t ${base} \t fee: ${fee}`,
    })
    pos = true;
    return { pos, base, mData: data, _cnt: 0, fee: fee.toNumber() * entry };
}
export const fillSellOrder = ({
    prevrow: row,
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
    isSl,
    isA,
    o
}: {
    exitLimit: number | null;
    exit: number;
    prevrow: ICandle;
    base: number;
    enterTs: string;
    pricePrecision: number | null;
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

    const _isTp = isSl == undefined ? exit >= entry : !isSl
    
    //console.log(`MIKA: ${exit >= entry ? "gain" : "loss"}`);
    console.log("\nFILL SELL ORDER");
    console.log({maker});
    console.log({ exitLimit, exit, entry, base });
    let _base = new BigNumber(base)
    let balance : number | BigNumber = _base.multipliedBy(exit) 
    console.log("BALANCE")
    const fee = balance.multipliedBy(maker)
    console.log(`B4 FEE: ${balance}`)
    if (!noFees)
        {balance = balance.minus(fee)}

    balance = toFixed(balance.toNumber(), ( pricePrecision!));
    console.log(`AFTER FEE: ${balance}\n`)
    const ts = row["ts"];
    
    const _entry = o ?? entry
    const perc = ((exit - _entry)/_entry * 100).toFixed(2)
    const part = isA == undefined ? '' : isA ? "[A]" : "[B]"
    mData["data"].push({
        side: `sell \t {h:${row.h}, l: ${row.l}, v: ${row.v || 'null'}}`,
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
