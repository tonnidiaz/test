import { coinApiDates } from "@/utils/consts2";
import { parseDate } from "@/utils/funcs2";
import { getLastItem } from "@/utils/funcs3";
import {
    ceil,
    clearTerminal,
    encodeDate,
    existsSync,
    readJson,
    toFixed,
} from "@/utils/functions";
import { IObj } from "@/utils/interfaces";
import { readdirSync } from "fs";
const DEXE_START = "2024-03-05T14:00:00+02:00",
    DEXE_END = "2024-03-05T17:00:00+02:00",
    GFT_START = "2024-04-14T13:00:00+02:00",
    GFT_END = "2024-04-14T15:00:00+02:00",
    BAL_START = "2024-04-14T00:00:00+02:00",
    BAL_END = "2024-04-14T23:59:00+02:00";

const root = "_data/coin-api/kucoin-spot/orderbook";

// const aPath = `_data/coin-api/kucoin-spot/orderbook/KUCOIN_SPOT_${symboA}_${
//     DEXE_START.split("T")[0]
// }_${DEXE_END.split("T")[0]}.json`;
// const bPath = `_data/coin-api/kucoin-spot/orderbook/KUCOIN_SPOT_${symboB}_${
//     DEXE_START.split("T")[0]
// }_${DEXE_END.split("T")[0]}.json`;
// const cPath = `_data/coin-api/kucoin-spot/orderbook/KUCOIN_SPOT_${symboC}_${
//     DEXE_START.split("T")[0]
// }_${DEXE_END.split("T")[0]}.json`;
clearTerminal();

console.log(`PID: ${process.pid}\n`);

const runTri = async ({
    minPerc,
    start,
    end,
    plat,
    B,
    C,
    A,
    pre,
}: {
    minPerc: number;
    plat: string;
    A: string;
    B: string;
    C: string;
    start: string;
    end: string;
    pre?: string;
}) => {
    pre = pre ? pre + "_" : "";
    let lastTs = 0; //dataA = dataA.filter((el, i, dt)=> i == 0 || Date.parse(el.time_exchange) >= Date.parse(dt[i - 1].time_exchange) + interval * 1000  )

    const symboA = `${B}_${A}`;
    const symboB = `${C}_${B}`;
    const symboC = `${C}_${A}`;
    console.log("\nBEGIN", { symboA, symboB, symboC }, "\n");
    const symbolIdA = plat.toUpperCase() + "_SPOT_" + symboA;
    const symbolIdB = plat.toUpperCase() + "_SPOT_" + symboB;
    const symbolIdC = plat.toUpperCase() + "_SPOT_" + symboC;

    const pathA = genFname({ symbolId: symbolIdA, start, end, pre, plat });
    const pathB = genFname({ symbolId: symbolIdB, start, end, pre, plat });
    const pathC = genFname({ symbolId: symbolIdC, start, end, pre, plat });

    let dataA = await readJson(pathA);
    let dataB = await readJson(pathB);
    let dataC = await readJson(pathC);

    const interval = 0.001; // secs
    let aTs = dataA[0].time_exchange;
    let bTs = dataB[0].time_exchange;
    let cTs = dataC[0].time_exchange;
    console.log({ cTs, bTs, aTs });

    let cnt = 0;
    const __dataA: any[] = [];
    while (lastTs <= Date.parse([...dataA].pop().time_exchange)) {
        cnt += 1;
    }
    lastTs = 0;
    let startTs = Math.max(Date.parse(aTs), Date.parse(bTs), Date.parse(cTs));
    // mainloop: for (let rowA of dataA) {
    //     for (let rowB of dataB) {
    //         for (let rowC of dataC) {
    //             const tsA = rowA.time_exchange;
    //             const tsB = rowB.time_exchange;
    //             const tsC = rowC.time_exchange;

    //             const tsMsA = Date.parse(tsA);
    //             const tsMsB = Date.parse(tsB);
    //             const tsMsC = Date.parse(tsC);
    //             if (tsMsA == tsMsB && tsMsB == tsMsC){
    //                 startTs = tsA
    //                 console.log("BREAK")
    //                 break mainloop
    //             }
    //         }
    //     }
    // }

    console.log({ startTs });

    dataB = dataB.filter((el) => Date.parse(el.time_exchange) >= startTs);
    dataA = dataA.filter((el) => Date.parse(el.time_exchange) >= startTs);
    dataC = dataC.filter((el) => Date.parse(el.time_exchange) >= startTs);

    aTs = dataA[0].time_exchange;
    bTs = dataB[0].time_exchange;
    cTs = dataC[0].time_exchange;

    // Space the books

    const _dataA: IObj[] = [];
    console.log({ lenA: dataA.length });
    for (let i = 0; i < dataA.length; i++) {
        const row = dataA[i];
        const ts = row.time_exchange;
        const tsMs = Date.parse(ts);

        if (tsMs >= lastTs + interval * 1000) {
            lastTs = tsMs;
            _dataA.push(row);
        }
    }
    console.log({ lenA: _dataA.length });

    lastTs = 0;
    const _dataB: IObj[] = [];
    console.log({ lenB: dataB.length });
    for (let i = 0; i < dataB.length; i++) {
        const row = dataB[i];
        const ts = row.time_exchange;
        const tsMs = Date.parse(ts);

        if (tsMs >= lastTs + interval * 1000) {
            lastTs = tsMs;
            _dataB.push(row);
        }
    }
    console.log({ lenB: _dataB.length });

    lastTs = 0;
    const _dataC: IObj[] = [];
    console.log({ lenC: dataC.length });
    for (let i = 0; i < dataC.length; i++) {
        const row = dataC[i];
        const ts = row.time_exchange;
        const tsMs = Date.parse(ts);

        if (tsMs >= lastTs + interval * 1000) {
            lastTs = tsMs;
            _dataC.push(row);
        }
    }
    console.log({ lenC: _dataC.length });

    const trades: { ts: string; perc: number; flipped: boolean }[] = [];

    console.log({ cTs, bTs, aTs }, "\n");

    const minLen = Math.min(_dataA.length, _dataB.length, _dataC.length);
    console.log(_dataB.map((el) => el.time_exchange));
    for (let i = 0; i < minLen; i++) {
        const rowA = _dataA[i];
        const rowB = _dataB[i];
        const rowC = _dataC[i];

        const tsA = rowA.time_exchange;
        const tsB = rowB.time_exchange;
        const tsC = rowC.time_exchange;

        //console.log("\n", { tsB }, "\n");
    }

    let lastTsA = 0;
    let lastTsB = 0;
    let lastTsC = 0;
    const AMT = 1;
    let bal = 50;
    const START_BAL = bal;

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    for (let i = 0; i < minLen; i++) {
        break;
        try {
            const rowA = _dataA[i];
            const rowB = _dataB[i];
            const rowC = _dataC[i];

            const tsA = rowA.time_exchange;
            const tsB = rowB.time_exchange;
            const tsC = rowC.time_exchange;

            const tsMsA = Date.parse(tsA);
            const tsMsB = Date.parse(tsB);
            const tsMsC = Date.parse(tsC);

            const tsCond =
                tsMsA >= lastTsA + interval * 1000 &&
                tsMsB >= lastTsB + interval * 1000 &&
                tsMsC >= lastTsC + interval * 1000;

            if (!rowA || !rowB || !rowC) continue;
            const askA = rowA.asks[0].price;
            const bidA = rowA.bids[0].price;
            const askB = rowB.asks[0].price;
            const bidB = rowB.bids[0].price;
            const askC = rowC.asks[0].price;
            const bidC = rowC.bids[0].price;

            if (tsCond) {
                console.log("\n", { tsA, tsB, tsC }, "\n");
                lastTsA = tsMsA;
                lastTsB = tsMsB;
                lastTsC = tsMsC;
                const fA2 = (bidB * bidA) / askC;
                const A2 = bidC / (askA * askB);
                const fperc = ceil(((fA2 - AMT) / AMT) * 100, 3);
                const perc = ceil(((A2 - AMT) / AMT) * 100, 3);

                if (perc < 0 && fperc < 0) continue;
                //console.log("\n", { tsA, tsB, tsC });

                console.log("\n", { perc: `${perc}%`, A2 });
                console.log({ fperc: `${fperc}%`, fA2 });

                const _perc = Math.max(perc, fperc);
                const flipped = fperc > perc;
                let _quote = 0,
                    _base = 0;
                if (_perc >= minPerc) {
                    if (flipped) {
                        let _base = bal / askC; // BUY at c
                        _base = toFixed(_base * (1 - TAKER), 10);
                        _quote = _base * bidB; // SELL AT B
                        _quote = toFixed(_quote * (1 - MAKER), 10);
                        _quote = _quote * bidA; // SELL AT A
                        _quote = toFixed(_quote * (1 - MAKER), 10);
                    } else {
                        let _base = bal / askA; // BUY at A
                        // console.log('\n', {baseA: _base})
                        _base = toFixed(_base * (1 - TAKER), 10);
                        _base = _base / askB; // BUY AT B
                        _base = toFixed(_base * (1 - TAKER), 10);
                        // console.log({baseB: _base})
                        _quote = _base * bidC; // SELL AT C
                        // console.log({quote: _quote})
                        _quote = toFixed(_quote * (1 - MAKER), 10);
                        // console.log({askA, askB, bidC})
                    }
                    console.log("\n", { _quote, flipped }, "\n");

                    bal = _quote;
                    trades.push({ ts: tsA, perc: _perc, flipped });
                }
            }
        } catch (e) {
            console.log(e);
            break;
        }
    }
    const profit = bal - START_BAL;
    console.log("\n", { trades: trades.length, profit });
    //console.log(trades);
};

const genFname = ({
    plat,
    start,
    end,
    pre,
    symbolId,
}: {
    plat: string;
    start: string;
    end: string;
    pre: string;
    symbolId: string;
}) => {
    const folder = "_data/coin-api/" + plat;
    const fname = `${symbolId}_${encodeDate(start)}-${encodeDate(end)}.json`;
    const savePath = `${folder}/${pre}${fname}`;
    return savePath;
};

const AMT = 1;
const getTsMs = (el: IObj) => Date.parse(el.time_exchange);
const runCross = async ({
    minPerc,
    symbol,
    start,
    end,
    platA,
    platB,
    pre,
}: {
    minPerc: number;
    platA: String;
    platB: string;
    start: string;
    end: string;
    symbol: string;
    pre?: string;
}) => {
    pre = pre ? pre + "_" : "";

    const symbolIdA = platA.toUpperCase() + "_SPOT_" + symbol;
    const symbolIdB = platB.toUpperCase() + "_SPOT_" + symbol;

    const folderA = "_data/coin-api/" + platA;
    const fnameA = `${symbolIdA}_${encodeDate(start)}-${encodeDate(end)}.json`;
    const savePathA = `${folderA}/${pre}${fnameA}`;

    const folderB = "_data/coin-api/" + platB;
    const fnameB = `${symbolIdB}_${encodeDate(start)}-${encodeDate(end)}.json`;
    const savePathB = `${folderB}/${pre}${fnameB}`;

    if (!existsSync(savePathA) || !existsSync(savePathB))
        return console.log("ONE OF THE FILES NOT FOUND\n", {
            savePathA,
            savePathB,
        });

    let bookA: IObj[] = await readJson(savePathA);
    let bookB: IObj[] = await readJson(savePathB);

    const interval = 7 * 60; // secs

    let tsA = bookA[0].time_exchange;
    let tsB = bookB[0].time_exchange;

    console.log({ tsA, tsB });
    // tsB = bookB[0].time_exchange;
    bookA = bookA.filter((el) => {
        const bool = getTsMs(el) > getTsMs(bookB[0]);
        return bool;
    });

    tsA = bookA[0].time_exchange;
    tsB = bookB[0].time_exchange;
    console.log({ tsA, tsB }, "\n");
    const orders: {ts: string, side: string, px: number, estPx: number, perc?: number; estPerc?: number}[] = []
    const trades: { ts: string; perc: number }[] = [];

    //console.log({ tsA, tsB }, "\n");

    let lastTsA = 0;
    let lastTsB = 0;
    let lastTsC = 0;
    const A = 1;
    let bal = 50;
    const START_BAL = bal;

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    // sell at next row
    const gap = 5; // Transfer time
    console.log({
        lastTsA: getLastItem(bookA).time_exchange,
        lastTsB: getLastItem(bookB).time_exchange,
    });
    const endAt = getTsMs(getLastItem(bookA));
    const startAt = getTsMs(bookA[0]);
    let lastTs = startAt;

    let pos = false;
    let base = 0;
    let entryLimit = 0, exitLimit = 0;
    while (lastTs <= endAt) {
        console.log({ ts: parseDate(lastTs) }, "\n");
        const ts = lastTs;
        lastTs += gap * 60000;
        const estBuyRow = getLastItem(bookA.filter((el) => getTsMs(el) <= ts));
        const estSellRow = getLastItem(bookB.filter((el) => getTsMs(el) <= ts));
        const estBuyPx = estBuyRow.asks[0].price;
        const estSellPx = estSellRow.bids[0].price;

        const estBuyTs = parseDate(estBuyRow.time_exchange);
        const estSellTs = parseDate(estSellRow.time_exchange);

        const A2 = (AMT * estSellPx) / estBuyPx;
        const estPerc = ceil(((A2 - AMT) / AMT) * 100, 2);

        console.log({ estBuyTs, estSellTs, estPerc: `${estPerc}%` }, "\n");

        if (!pos && estPerc >= minPerc) {
            console.log("BUY");
            entryLimit = estBuyPx
            exitLimit = estSellPx
            const buyPx = estBuyRow.asks[0].price;
            base = toFixed((bal / buyPx) * (1 - TAKER), 10);

            console.log({entryLimit, buyPx})
            console.log("WITHDRAW\n");
            orders.push({ts: parseDate(ts), px: buyPx, estPx: estBuyPx, side: 'buy'})

            pos = true;
        } else if (pos) {
            console.log("SELL");
            const sellPx = estSellPx
            console.log({exitLimit, sellPx})
            bal = toFixed((base * sellPx) * (1 - MAKER), 2)
            console.log("WITHDRAW\n");
            orders.push({ts: parseDate(ts), px: sellPx, estPx: estSellPx, side: 'sell'})
            pos = false;
        }
    }
    // for (let i = 0; i < bookA.length; i++) {
    //     break
    //     try {
    //         const rowA = bookA[i];

    //         const tsA = rowA.time_exchange;

    //         const tsMsA = Date.parse(tsA);
    //         const rowB = [
    //             ...bookB.filter((el) => {
    //                 const ts = Date.parse(el.time_exchange);
    //                 return ts <= tsMsA;
    //             }),
    //         ].pop();
    //         const nextTs = tsMsA + gap * 60000;
    //         let nextrowB = bookB.find((el) => {
    //             const ts = Date.parse(el.time_exchange);

    //             return ts >= nextTs && ts <= nextTs + 2 * 60000; // not more than 2 minutes from next ts
    //         });
    //         if (!nextrowB) break;

    //         // rowB =
    //         //     rowB ??
    //         //     bookB[
    //         //         bookB.lastIndexOf(
    //         //             (el) => Date.parse(el.time_exchange) > tsMsA
    //         //         )
    //         //     ];

    //         const nexttsB = nextrowB.time_exchange;
    //         const nexttsMsB = Date.parse(nexttsB);
    //         const tsB = rowB.time_exchange;
    //         const tsMsB = Date.parse(tsB);

    //         const tsCond = tsMsA >= lastTsB + interval * 1000;

    //         if (!rowA || !rowB) continue;
    //         const askA = rowA.asks[0].price;
    //         const bidA = rowA.bids[0].price;
    //         const askB = rowB.asks[0].price;
    //         const bidB = rowB.bids[0].price;
    //         const nextaskB = nextrowB.asks[0].price;
    //         const nextbidB = nextrowB.bids[0].price;

    //         if (tsCond) {
    //             const estBuyPx = askA,
    //                 estSellPx = bidB,
    //                 buyPx = askA,
    //                 sellPx = nextbidB;
    //             console.log("\n", { tsA, tsB, nexttsB, buyPx, sellPx }, "\n");
    //             lastTsA = tsMsA;
    //             lastTsB = nexttsMsB;

    //             const A2 = (A * estSellPx) / estBuyPx;

    //             const perc = ceil(((A2 - A) / A) * 100, 3);

    //             //console.log("\n", { tsA, tsB, tsC });

    //             console.log("\n", { perc: `${perc}%`, A2 });

    //             let _quote = 0,
    //                 _base = 0;
    //             if (perc >= minPerc) {
    //                 _base = bal / buyPx; // BUY at c
    //                 _base = toFixed(_base * (1 - TAKER), 10);
    //                 _quote = _base * sellPx; // SELL AT B
    //                 _quote = toFixed(_quote * (1 - MAKER), 10);
    //                 console.log("\n", { _quote }, "\n");

    //                 bal = _quote;
    //                 trades.push({ ts: tsA, perc });
    //             }
    //         }
    //     } catch (e) {
    //         console.log(e);
    //         break;
    //     }
    // }

    const profit = bal - START_BAL;
    console.log("\n", { trades: Math.floor(orders.length/ 2), profit });
    //console.log(trades);
};

const BDX_START = "2024-03-13 13:00:00+02:00",
    BDX_END = "2024-03-14 00:00:00+02:00";

const side = "cross";

const C = "UNO";

if (side == "cross")
    runCross({
        symbol: "BDX_USDT",
        platA: "mexc",
        platB: "kucoin",
        start: BDX_START,
        end: BDX_END,
        minPerc: 0.3,
    });
else
    runTri({
        minPerc: 0.5,
        plat: "kucoin",
        A: "USDT",
        B: "BTC",
        C,
        ...coinApiDates[C],
    });
