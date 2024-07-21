import { isStopOrder, noFees } from "@/utils/constants";
import { toFixed } from "@/utils/functions";
import { IObj } from "@/utils/interfaces";

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
    let base = balance / entry// * (1 - taker);
    const fee = base * taker
    console.log("BASE:")
    console.log(`B4 FEE: ${base}`)
    if (!noFees)
        base -= fee
    console.log(`AFTER FEE: ${base}\n`)
    //console.log({balance, base, entry, taker, basePrecision});
    base = toFixed(base, basePrecision);
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
    return { pos, base, mData: data, _cnt: 0, fee: fee * entry };
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
    isA?: boolean
}) => {

    const _isTp = !isStopOrder ? exit >= entry : !isSl
    console.log({ exitLimit, exit, entry, base });
    //console.log(`MIKA: ${exit >= entry ? "gain" : "loss"}`);
    console.log("\nFILL SELL ORDER", {exit, base});
    let balance = base * exit
    console.log("BALANCE")
    const fee = balance * maker
    console.log(`B4 FEE: ${balance}`)
    if (!noFees)
        balance -= fee
    balance = toFixed(balance, ( pricePrecision));
    console.log(`AFTER FEE: ${balance}\n`)
    const ts = prevRow["ts"];
    
    const part = isA ? "A" : "B"
    mData["data"].push({
        side: `sell \t {h:${prevRow.h}, l: ${prevRow.l}}`,
        fill: exitLimit,
        enterTs,
        ts,
        c: `[${part}] ${!_isTp ? 'SL' : 'TP'}: ${exit}`,
        _c: exit,
        balance: `[${base}] \t ${balance} { ${((exit - entry)/entry * 100).toFixed(2)}% } fee: ${fee}`,
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
        balance,
        cnt,
        sl,
        tp,
        gain,
        loss,
        mData,
        fee
     //   _bal,
    };
};
