import { binanceInstrus } from "@/utils/data/instrus/binance-instrus";
import { bitgetInstrus } from "@/utils/data/instrus/bitget-instrus";
import { gateioInstrus } from "@/utils/data/instrus/gateio-instrus";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { bybitInstrus } from "@/utils/data/instrus/bybit-instrus";
import { existsSync } from "fs";
import { parseDate, parseKlines } from "@/utils/funcs2";
import {
    calcPerc,
    ceil,
    getCoinPrecision,
    getPricePrecision,
    getSymbol,
    randomNum,
    readJson,
    sleep,
    toFixed,
} from "@/utils/functions";
import { scheduleJob } from "node-schedule";
import { mexcInstrus } from "@/utils/data/instrus/mexc-instrus";
import { objPlats } from "@/utils/consts2";
import { ARBIT_ZERO_FEES, klinesRootDir, noFees } from "@/utils/constants";
import { ICandle, IObj, TPlatName } from "@/utils/interfaces";

import { Bot, Order, TriArbitOrder } from "@/models";
import { clearTerminal } from "@/utils/functions";
import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import { parseArbitOrder } from "@/utils/funcs3";
import { TestMexc } from "@/classes/test-mexc";
import { TestKucoin } from "@/classes/test-kucoin";
import { test_platforms } from "@/utils/consts";
import { connectMongo, fetchAndStoreBooks } from "@/utils/funcs4";

const AMT = 1;
const parseOB = (ob: IObj[]) => {
    const _ob :IObj[] = []
    const interval = Math.floor(
        (Date.parse(ob[1].ts) - Date.parse(ob[0].ts)) / 60000
    );
    console.log({ interval });

    for (let i = 0; i < ob.length; i++) {
        const book = ob[i];
        if (i > 0) {
            const diff = Math.floor(
                (Date.parse(ob[i].ts) - Date.parse(ob[i - 1].ts)) / 60000
            );
            if (diff > interval) {
                console.log("\nBook invalid", { diff, interval }, "\n");
                break;
            }
        }
        _ob.push(book)
    }
    console.log("book ok\n");
    return _ob;
};
async function fetchOB({
    A,
    B,
    C,
    plat,
    minPerc = 0.3,
}: {
    A: string;
    B: string;
    C: string;
    plat: TPlatName;
    minPerc?: number;
}) {
    let bal = 50, trades = 0;

    const START_BAL = bal;
    const pth = "_data/ob/Custom/ob.json";
    const pairA = [B, A],
        pairB = [C, B],
        pairC = [C, A];

    const pxPrA = getPricePrecision(pairA, plat);
    const pxPrB = getPricePrecision(pairB, plat);
    const pxPrC = getPricePrecision(pairC, plat);

    const basePrA = getCoinPrecision(pairA, "limit", plat);
    const basePrB = getCoinPrecision(pairB, "limit", plat);
    const basePrC = getCoinPrecision(pairC, "limit", plat);

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    if (
        pxPrA == null ||
        basePrA == null ||
        pxPrB == null ||
        basePrB == null ||
        pxPrC == null ||
        basePrC == null
    )
        return console.log("SOME PRECISION NOT AVAIL");

    const books =  readJson(pth);
    const platBooks = books.filter((el) => el.plat == plat);
    const obA = platBooks.find((el) => el.pair.toString() == pairA.toString());
    const obB = platBooks.find((el) => el.pair.toString() == pairB.toString());
    const obC = platBooks.find((el) => el.pair.toString() == pairC.toString());
    let bookA = parseOB(obA.book);
    let bookB = parseOB(obB.book);
    let bookC = parseOB(obC.book);
    console.log({
        bookA: bookA?.length,
        bookB: bookB?.length,
        bookC: bookC?.length,
    });

    let tsA = bookA[0].ts;
    let tsB = bookB[0].ts;
    let tsC = bookC[0].ts;

    const startTsMs = Math.max(
        Date.parse(tsA),
        Date.parse(tsB),
        Date.parse(tsC)
    );
    const startTs = parseDate(startTsMs);
    console.log({ startTs });

    bookA = bookA.filter((el) => Date.parse(el.ts) >= startTsMs);
    bookB = bookB.filter((el) => Date.parse(el.ts) >= startTsMs);
    bookC = bookC.filter((el) => Date.parse(el.ts) >= startTsMs);

    const minLen = Math.min(bookA.length, bookB.length, bookC.length);

    for (let i = 0; i < minLen; i++) {
        const rowA = bookA[i];
        const rowB = bookB[i];
        const rowC = bookC[i];

        const tsA = rowA.ts
        const tsB = rowB.ts
        const tsC = rowC.ts
        console.log(({tsA, tsB, tsC}));
        if (rowA.ts != rowB.ts && rowB.ts != rowC.ts) {
            console.log('TIMESTAMPS DO NOT MATCH');
            }

        const askPxA = rowA.asks[0].px;
        const askPxB = rowB.asks[0].px;
        const askPxC = rowC.asks[0].px;

        const bidPxA = rowA.bids[0].px;
        const bidPxB = rowB.bids[0].px;
        const bidPxC = rowC.bids[0].px;

        const A2 = (AMT * bidPxC) / (askPxA * askPxB);
        const fA2 = (AMT * bidPxA * bidPxB) / askPxC;

        const perc = calcPerc(AMT, A2);
        const fperc = calcPerc(AMT, fA2);

        if (perc > 0 || fperc > 0) {
            console.log({ perc, fperc });
            console.log({ askPxA, askPxB, askPxC }, "\n");
        }

        const _perc = Math.max(perc, fperc);
        const flipped = fperc > perc;
        if (_perc >= minPerc) {
            console.log("GOING IN...\n");

            let base = 0,
                quote = 0;

            if (flipped) {
                base = bal / askPxC; // BUY AT C
                base = toFixed(base * (1 - TAKER), basePrB);

                // SELL AT B
                base = base * bidPxB;
                base = toFixed(base * (1 - MAKER), basePrA);

                // SELL AT A
                quote = base * bidPxA;
                quote = toFixed(quote * (1 - MAKER), pxPrA);
            } else {
                base = bal / askPxA; // BUY AT A
                base = toFixed(base * (1 - TAKER), basePrB);

                // BUY AT B
                base = base / askPxB;
                base = toFixed(base * (1 - TAKER), basePrC);

                // SELL AT C
                quote = base * bidPxC;
                quote = toFixed(quote * (1 - MAKER), pxPrC);
            }
            trades += 1
            bal = quote;
        }
    }

    const profit = toFixed(bal - START_BAL, 2)
    console.log({profit, trades})
}

fetchOB({ plat: "okx", A: "USDT", B: "USDC", C: "1INCH" });
