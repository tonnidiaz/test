/* 



const arbit = async ({pair, interval, year, plt1,plt2, MIN_PERC, demo = false}: {pair: string[], interval: number, year: number, demo?: boolean, plt1: string, plt2: string, MIN_PERC: number}) => {
    let platA: IPlat = { name: plt1, base: 0, quote: 0 };
    let platB: IPlat = { name: plt2, base: 0, quote: 0 };

   
    const k1Path = getKlinesPath({
        plat: platA.name,
        pair,
        interval,
        year,
        demo,
    });
    const k2Path = getKlinesPath({
        plat: platB.name,
        pair,
        interval,
        year,
        demo,
    });

    const balance = 50;

    if (!existsSync(k1Path)) {
        console.log(k1Path, "DOES NOT EXIST");
        return;
    }
    if (!existsSync(k2Path)) {
        console.log(k2Path, "DOES NOT EXIST");
        return;
    }

    const kA = await readJson(k1Path);
    const kB = await readJson(k2Path);

    const df1 = parseKlines(kA);

    const df2 = parseKlines(kB);

    const len1 = df1.length,
        len2 = df2.length;

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    const BASE_FEE = ARBIT_ZERO_FEES ? 0 : 0.0064, // AVAX-C
        QUOTE_FEE = ARBIT_ZERO_FEES ? 0 : 0.11; // USDT-AVAX-C

    let lastRow = df1[0];

    const buy = (amt: number, px: number, row: ICandle) => {
        console.log(`BUYING AT`, { px });
        platA.quote -= amt;
        const _base = amt / px;
        const fee = _base * TAKER;

        console.log({ _base, fee });
        platA.base += _base;
        platA.base -= fee;
        pos = true;
        lastRow = row;
    };

    const withdraw = ({
        _base,
        _quote,
    }: {
        _base?: number;
        _quote?: number;
    }) => {
        if (_base) {
            platA.base -= _base;
            platB.base += _base - BASE_FEE;
        } else if (_quote) {
            platB.quote -= _quote;
            platA.quote += _quote - QUOTE_FEE;
        }
    };

    const sell = (amt: number, px: number) => {
        console.log(`SELLNG AT`, { px });
        platB.base -= amt;
        const _bal = amt * px;
        const fee = _bal * MAKER;
        console.log({ _bal, fee });

        platB.quote += _bal;
        platB.quote -= fee;
        pos = false;
    };

    let pos = false;
    // BUY AT 2, SELL AT 1
    console.log({ len1, len2 });

    platA.quote = balance;

    const _buy = (amt, px, row) => {
        if (!platA.quote) {
            return console.log("CANNOT BUY");
        }
        buy(amt, px, row);
    };
    const _sell = (amt, px) => {
        if (!platB.base) {
            return console.log("CANNOT BSELLUY");
        }
        sell(amt, px);
    };

    for (let i = 0; i < Math.min(len1, len2); i++) {
        const row1 = df1[i],
            row2 = df2[i];

        const buyPx = row1.o,
            sellPx = row2.o;

        const diff = Number((((sellPx - buyPx) / buyPx) * 100).toFixed(2));
        console.log("\n", { ts: row1.ts, diff, v1: row1.v, v2: row2.v }, "\n");

        if (!row1.v || !row2.v){
            console.log("NO VOL")
            continue
        }
        if (diff >= MIN_PERC) {
            _buy(platA.quote, buyPx, row2);
            withdraw({_base: platA.base})
            _sell(platB.base, sellPx);
            withdraw({_quote: platB.quote})
        }
    }


    // let profit = platA.quote ?? platB.quote;
    // let _base = platA.base ?? platB.base;
    // if (_base && !profit){
       
    //     profit = _base * lastRow.o
    //      _base = 0
    // }
    console.log("\n", { platA, platB });
};


const demo = false,
year = 2024,
interval = 60;
const MIN_PERC = 3

const plt1 = 'okx', plt2 = 'binance'
arbit({pair: ["SOL", "USDT"], interval, year, demo, plt1, plt2, MIN_PERC});


*/

import { existsSync, writeFileSync } from "fs";
import { parseDate, parseKlines } from "@/utils/funcs2";

import { Arbit } from "@/bots/arbitrage/classes";
import { getInstrus, getKlinesPath } from "@/utils/funcs3";
import {
    getPricePrecision,
    readJson,
    getCoinPrecision,
} from "@/utils/functions";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { bybitInstrus } from "@/utils/data/instrus/bybit-instrus";
import { ensureDirExists } from "@/utils/orders/funcs";

// BYBIT, BINANCE 15min PEPE works
// BYBIT, BINANCE 15min UMA works
async function run() {
    const data = {
        platB: "bybit", 
        platA: "binance",
        interval: 60, 
        start: "2024-01-01 00:00:00+02:00",
        end: "2024-10-28 23:59:00+02:00",
        only: undefined, //["JOE", "USDT"],
        save: true,
        demo: false,
        join: false,
        bal: 50,
    };

    const { platA, platB, interval, start, end, demo, bal, only, save, join } = data;

    const QUOTE_FEE = 0,
        BASE_FEE = 0;

    const year = Number(start.split("-")[0]);

    let instrusA = getInstrus(platA);
    let instrusB = getInstrus(platB);

    if (only) {
        instrusA = instrusA.filter(
            (el) => el[0] == only[0] && el[1] == only[1]
        );
        instrusB = instrusB.filter(
            (el) => el[0] == only[0] && el[1] == only[1]
        );
    }
    instrusA = instrusA.filter(
        (el) =>
            instrusB.findIndex((el2) => el2.toString() == el.toString()) != -1
    );
    instrusB = instrusA.filter(
        (el) =>
            instrusA.findIndex((el2) => el2.toString() == el.toString()) != -1
    );

    const iLen = instrusA.length;
    const instrus = instrusA.sort();

    const savePath = `_data/rf/arbit/coins/${year}/${platA}-${platB}_${interval}m.json`;
    if (join){

    }
    console.log(instrus.length);
    ensureDirExists(savePath);

    let _data: { pair: string[]; profit: number; trades: number }[] = [];


    const _save = ()=>{
        if (save)
            {writeFileSync(savePath, JSON.stringify(_data)); console.log("SAVED\n")}
    }

    let zvA = 0, zvB //ZERO  VOLS
    for (let i = 0; i < iLen; i++) {
        const pair = instrus[i];
        console.log("\nBEGIN PAIR", pair);

        const k1Path = getKlinesPath({
            plat: platA,
            pair,
            interval,
            year,
            demo,
        });
        const k2Path = getKlinesPath({
            plat: platB,
            pair,
            interval,
            year,
            demo,
        });

        const pxPr = getPricePrecision(pair, platB);
        const basePr = getCoinPrecision(pair, "limit", platB);

        if (pxPr == null || basePr == null) {
            console.log("Precision error:", { pxPr, basePr });
            continue;
        }
        if (!existsSync(k1Path)) {
            console.log(k1Path, "DOES NOT EXIST");

            continue;
        }
        if (!existsSync(k2Path)) {
            console.log(k2Path, "DOES NOT EXIST");

            continue;
        }

        const kA = await readJson(k1Path);
        const kB = await readJson(k2Path);

        if (!kA.length || !kB.length) continue;

        let dfA = parseKlines(kA),
            dfB = parseKlines(kB);

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

        // START AT THE LATEST START
        const realStartMs = Math.max(
            Date.parse(dfA[0].ts),
            Date.parse(dfB[0].ts)
        );

        dfA = dfA.filter((el) => {
            const tsMs = Date.parse(el.ts);
            return tsMs >= realStartMs;
        });

        dfB = dfB.filter((el) => {
            const tsMs = Date.parse(el.ts);
            return tsMs >= realStartMs;
        });

        const bt = new Arbit({
            platA,
            platB,
            BASE_FEE,
            QUOTE_FEE,
            bal,
            dfA,
            dfB,
            basePr,
            pxPr,
        });
        const res = bt.run();
        _data.push({ pair, profit: res.profit, trades: res.trades });
        _data = [..._data].sort((a, b) => (a.profit > b.profit ? -1 : 1));

        _save()
        console.log(`\n${pair} DONE`);
    }
    _data = [..._data].sort((a, b) => (a.profit > b.profit ? -1 : 1));
    _save()
    console.log("\nALL DONE");
}

run();
