
import { existsSync, writeFileSync } from "fs";
import { parseDate, parseKlines } from "@/utils/funcs2";

import { Arbit } from "@/bots/arbitrage/classes";
import { getInstrus, getKlinesPath } from "@/utils/funcs3";
import {
    getPricePrecision,
    readJson,
    getCoinPrecision,
    clearTerminal,findAve, toFixed
} from "@/utils/functions";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { bybitInstrus } from "@/utils/data/instrus/bybit-instrus";
import { ensureDirExists } from "@/utils/orders/funcs";
import { XRP_WITHDRAW_FEE } from "@/utils/constants";
import { IObj } from "@/utils/interfaces";

// BYBIT, BINANCE 15min PEPE works
// BYBIT, BINANCE 15min UMA works



const coin = {pair: ["THETA", "USDT"], fee: {base: .24, quote: XRP_WITHDRAW_FEE}}
async function run() {
    clearTerminal()
    const one=  true
    const data = {
        
        plat: "binance", 
        interval: 60, 
        start: "2024-01-01 00:00:00+02:00", 
        end: "2024-10-28 23:59:00+02:00",
        save: !one,
        demo: false,
        join: false,
        bal: 50, 
        prefix: 'MED-THETA',
        pairA:  ["BTC", "USDT"],
        pairB: ["PAXG", "BTC"],
        pairC: ["PAXG", "USDT"]
    };

    let {plat, interval, start, end, demo, bal, save, join, prefix, pairA, pairB, pairC } = data;
    prefix = prefix ? `${prefix}_` : ''

    const MAKER = .1/100, TAKER = .1/100
    const QUOTE_FEE = 0,
        BASE_FEE = 0;
    let msg = ""
    
    const year = Number(start.split("-")[0]);


   let trades = 0
   const START_BAL = bal
    let _data: { pair: string[]; profit: number; trades: number }[] = [];
    let last: string[] | undefined;
    let gains: number[]= []

    const savePath = `_data/rf/arbit-tri/${plat}/${year}/${prefix}${pairA.join('-')}_${pairB.join('-')}_${pairC.join('-')}_${interval}m.json`;

    ensureDirExists(savePath);

    const _save = ()=>{
        if (save)
            {writeFileSync(savePath, JSON.stringify(_data)); console.log("SAVED\n")}
    }

    
    const klinesPathA =  getKlinesPath({plat, interval, year, pair: pairA, demo})
    const klinesPathB =  getKlinesPath({plat, interval, year, pair: pairB, demo})
    const klinesPathC =  getKlinesPath({plat, interval, year, pair: pairC, demo})

   if (!existsSync(klinesPathA)){
    return console.log(`${klinesPathA} DOES NOT EXIST`)
   }
   if (!existsSync(klinesPathB)){
    return console.log(`${klinesPathB} DOES NOT EXIST`)
   }
   if (!existsSync(klinesPathC)){
    return console.log(`${klinesPathC} DOES NOT EXIST`)
   }

   const ksA = await readJson(klinesPathA)
   const ksB = await readJson(klinesPathB)
   const ksC = await readJson(klinesPathC)

    let dfA = parseKlines(ksA ?? [])
    let dfB = parseKlines(ksB ?? [])
    let dfC = parseKlines(ksC ?? [])

    const startMs = Date.parse(start);
        const endMs = Date.parse(end);

        dfA = dfA.filter((el) => {
            const tsMs = Date.parse(el.ts);
            return tsMs >= startMs && tsMs <= endMs;
        });

        dfB = dfB.filter((el) => {
            const tsMs = Date.parse(el.ts);
            return tsMs >= startMs && tsMs <= endMs;
        });
        dfC = dfC.filter((el) => {
            const tsMs = Date.parse(el.ts);
            return tsMs >= startMs && tsMs <= endMs;
        });

        const realStartMs = Math.max(
            Date.parse(dfA[0].ts),
            Date.parse(dfB[0].ts),
            Date.parse(dfC[0].ts)
        );

        dfA = dfA.filter((el) => {
            const tsMs = Date.parse(el.ts);
            return tsMs >= realStartMs;
        });

        dfB = dfB.filter((el) => {
            const tsMs = Date.parse(el.ts);
            return tsMs >= realStartMs;
        });
        dfC = dfC.filter((el) => {
            const tsMs = Date.parse(el.ts);
            return tsMs >= realStartMs;
        });

        const iLen = Math.min(dfA.length, dfB.length, dfC.length)
    

    for (let i = 0; i < iLen; i++) {
        const rowA = dfA[i]
        const rowB = dfB[i]
        const rowC = dfC[i]

        console.log("\n", {a: rowA.ts, b: rowB.ts, c: rowC.ts})
        const baseA = (bal / rowA.o) //* (1 - TAKER)
        const baseB = (baseA / rowB.o) //* (1 - TAKER)
        const _quote = (baseB * rowC.o) //* (1 - MAKER)

        // const baseC = bal / rowC.o
        // const quoteB = baseC * rowB.o
        // const _quote = quoteB * rowA.o


        const pr = (_quote - bal) / bal * 100


        console.log({pr: pr.toFixed(2) + "%"})

        if (pr >= .5){
            console.log("GOING IN...")
            bal = toFixed(_quote, 2)
            trades += 1
        }
        if (pr >= 0){
            gains.push(pr)
        }
    }
    _data = [..._data].sort((a, b) => (a.profit > b.profit ? -1 : 1));
    _save()

    const prAves = findAve(gains)
    const profit = bal - START_BAL
    console.log("\nALL DONE");

    console.log({bal, profit, trades,prAves})
}

run();
