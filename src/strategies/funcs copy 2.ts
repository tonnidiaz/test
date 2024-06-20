import { Strategy } from "@/classes/strategy";
import { data } from "@/data/data";
import { MAKER_FEE_RATE, TAKER_FEE_RATE, slPercent } from "@/utils/constants";
import { IObj } from "@/utils/interfaces";

let enterTs = "";
interface IBalProfitCalc {
    balance: number;
    base: number;
    exit: number;
    data: IObj;
    ccy: string;
    row: IObj;
}
export const balProfitCalc: (props: IBalProfitCalc) => any[] = ({
    balance,
    base,
    exit,
    data,
    ccy,
    row,
}) => {
    /**
     * We are selling
     * Returns balance, profit, data
     *  */
    let newBalance = base * exit;
    newBalance -= newBalance * MAKER_FEE_RATE;
    let profit = newBalance - balance;
    let profitPercentage = (profit / balance) * 100; //(exit - entry) / entry * 100
    profitPercentage = Number(profitPercentage.toFixed(4));
    balance += profit;
    profit = Number(profit.toFixed(ccy == "USDT" ? 4 : 6));

    newBalance = Number(newBalance.toFixed(ccy == "USDT" ? 4 : 6));

    data["data"][row["ts"]] = {
        side: `sell \t {h:${row.h}, l: ${row.l}}`,
        enterTs,
        fill: exit,
        c: exit.toFixed(ccy == "USDT" ? 4 : 6),
        balance: newBalance,
        profit: `${profit}\t${profitPercentage}%`,
    };
    //for (let k of Object.keys(data.data))
    return [balance, profit, data];
};

export const strategy = (
    df: IObj[],
    balance: number,
    buyCond: (row: IObj, df?: IObj[], i?: number) => boolean,
    sellCond: (row: IObj, entry: number, df?: IObj[], i?: number) => boolean,
    lev = 1,
    pGain?: number,
    ccy = ""
) => {
    let pos = false;
    let cnt = 0,
        gain = 0,
        loss = 0;
 
    pGain = pGain ?? data.pGain;

    let mData: IObj = { data: {} },
        _data: IObj;
    console.log("CE_SMA: BEGIN BACKTESTING...\n");
    let entry: number = 0,
        entryLimit: number | null = null,
        exitLimit: number | null = null,
        base: number = 0,
        exit: number = 0,
        profit: number = 0;

    for (let i = 1; i < df.length; i++) {
        const row = df[i];
        const prevRow = df[i - 1]
        console.log(`\n[${i}]\t[${row.ts}]\n`);
        /* CHECK AND UPDATE OPEN POSITION FIRST */
        if (entryLimit) {
            // Fill buy pos
            let goOn = false;
            /* TEST PREVIOUS CANDLE */
            if (prevRow.l < entryLimit && entryLimit < prevRow.h) {
                console.log(`[${prevRow.ts}] \t  L < Entry_Limit  < H`)
                entry = entryLimit; goOn=true}
            else if (sellCond(prevRow, entryLimit)) {
                console.log(`${row.ts} \t CANCELLING BUY ORDER`);
                entryLimit = null;
                goOn = false;
            }

            if (goOn) {
                console.log(`\nFILLING BUY ORDER at ${entryLimit} => ${entry}\n`);
                balance *= lev;

                base = balance / entry;
                base -= base * TAKER_FEE_RATE;
                mData["data"][prevRow["ts"]] = {
                    side: `buy \t {h:${prevRow.h}, l: ${prevRow.l}}`,
                    fill: entryLimit,
                    enterTs,
                    c: entry.toFixed(ccy == "USDT" ? 4 : 6),
                    balance: base.toFixed(6), 
                };
                //entryLimit = null;
                pos = true; 
            }
        } else if (exitLimit) {
            // Fill sell pos
            let goOn = false;
            if (prevRow.l < exitLimit && exitLimit < prevRow.h){ 
                console.log(`[${prevRow.ts}] \t  L < Exit_Limit  < H`)
                exit = exitLimit; goOn=true}
            else if (buyCond(prevRow)) {
                console.log(`${row.ts} \t CANCELLING SELL ORDER`);
                goOn = false;
                exitLimit = null;
               
            }
            if (goOn) {
                console.log("FILLING SELL ORDER");

                [balance, profit, _data] = balProfitCalc({
                    base,
                    balance,
                    exit,
                    data: mData,
                    row: prevRow,
                    ccy,
                });

                if (profit < 0) loss += 1;
                else gain += 1;

                mData = _data;
                pos = false;
                cnt += 1;
                exitLimit = null;
                entryLimit = null;
            }
        }
        /* CHECK FOR SIGNALS */
        if (!entryLimit && buyCond(prevRow, df, i)) {
            // Place limit buy order
            entryLimit = prevRow.c;
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit buy order at ${entryLimit?.toFixed(2)}`
            );
        } else if (pos && sellCond(prevRow, entry, df, i)) {
            // Place limit sell order
            exitLimit = prevRow.c;
            enterTs = row.ts;
            console.log(
                `[ ${row.ts} ] \t Limit sell order at ${exitLimit?.toFixed(2)}`
            );
        }
    }

    console.log(`TOTAL TRADES: ${cnt}`);
  
    cnt = cnt > 0 ? cnt : 1;
    gain = Number(((gain * 100) / cnt).toFixed(4));
    loss = Number(((loss * 100) / cnt).toFixed(4));
    mData = {
        ...mData,
        balance: (balance / lev).toFixed(ccy == "USDT" ? 4 : 6),
        trades: cnt,
        gain: gain,
        loss: loss,
    };
    return mData;
};
