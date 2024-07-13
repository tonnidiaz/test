import { noFees } from "@/utils/constants";
import { toFixed } from "@/utils/functions";
import { IObj } from "@/utils/interfaces";

export function fillBuyOrder({
    entry,
    prevRow,
    taker,
    enterTs,
    base,
    balance,
    mData,
    entryLimit,
    basePrecision,
    pos,
}: {
    entry: number;
    prevRow: any;
    taker: number;
    enterTs: string;
    base: number;
    balance: number;
    basePrecision: number;
    mData: IObj;
    entryLimit: number;
    pos: boolean;
}) {
    console.log('FILL BUY ORDER');
    base = balance / entry// * (1 - taker);
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
    data.data.push({
        side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
        fill: entryLimit,
        base,
        enterTs,
        ts,
        c: entry,
        balance: `[${balance}] \t ${base} \t fee: ${fee}`,
    })
    pos = true;
    return { pos, base, balance, mData: data, _cnt: 0, fee: fee * entry };
}
export const fillSellOrder = ({
    prevRow,
    exit,
    exitLimit,
   // _bal,
    base,
    enterTs,
    pricePrecision,
    mData,
    balance,
    entry,
    cnt,
    gain,
    loss,
    sl,
    tp,
    pos,
    maker,
    entryLimit,
    isSl = false
}: {
    exitLimit: number | null;
    exit: number;
    prevRow: IObj;
  //  _bal: number;
    base: number;
    enterTs: string;
    pricePrecision: number;
    mData: IObj;
    balance: number;
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
}) => {
    console.log({ exitLimit, exit, entry });
    //console.log(`MIKA: ${exit >= entry ? "gain" : "loss"}`);
    console.log("FILL SELL ORDER");
    balance = base * exit
    console.log("BALANCE")
    const fee = balance * maker
    console.log(`B4 FEE: ${balance}`)
    if (!noFees)
        balance -= fee
    balance = toFixed(balance, ( pricePrecision));
    console.log(`AFTER FEE: ${balance}\n`)
    const ts = prevRow["ts"];
    mData["data"].push({
        side: `sell \t {h:${prevRow.h}, l: ${prevRow.l}}`,
        fill: exitLimit,
        enterTs,
        ts,
        c: `${isSl ? 'SL' : 'TP'} ${exit}`,
        balance: `[${base}] \t ${balance} { ${((exit - entry)/entry * 100).toFixed(2)}% } fee: ${fee}`,
    });
    /* Position now filled */
    base = 0;
    exitLimit = null;

    /* ADD FUNDS BACK TO PORTFOLIO */

    //balance += _bal;
    if (!isSl) gain += 1;
    else loss += 1;
    cnt += 1;
    (entryLimit = null), (tp = null), (sl = null), (pos = false);

    return {
        entryLimit,
        base,
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
