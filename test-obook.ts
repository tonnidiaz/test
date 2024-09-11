import { coinApiDates } from "@/utils/consts2";
import {
    ceil,
    clearTerminal,
    encodeDate,
    existsSync,
    readJson,
    toFixed,
} from "@/utils/functions";
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

    const interval = 30; // secs
    let aTs = dataA[0].time_exchange;
    let bTs = dataB[0].time_exchange;
    let cTs = dataC[0].time_exchange;
    console.log({ cTs, bTs, aTs });

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

    console.log({startTs})

    dataB = dataB.filter(
        (el) => Date.parse(el.time_exchange) >=startTs
    );
    dataA = dataA.filter(
        (el) => Date.parse(el.time_exchange) >=startTs
    );
    dataC = dataC.filter(
        (el) => Date.parse(el.time_exchange) >=startTs
    );

    aTs = dataA[0].time_exchange;
    bTs = dataB[0].time_exchange;
    cTs = dataC[0].time_exchange;

    const trades: { ts: string; perc: number; flipped: boolean }[] = [];

    console.log({ cTs, bTs, aTs }, "\n");

    let lastTsA = 0;
    let lastTsB = 0;
    let lastTsC = 0;
    const AMT = 1;
    let bal = 50;
    const START_BAL = bal;

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    for (let i = 0; i < dataA.length; i++) {
        try {
            const rowA = dataA[i];
            const rowB = dataB[i];
            const rowC = dataC[i];

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
                console.log("\n", { ts: tsA }, "\n");
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

    let bookA = await readJson(savePathA);
    let bookB = await readJson(savePathB);

    const interval = 7 * 60; // secs

    let tsA = bookA[0].time_exchange;
    let tsB = bookB[0].time_exchange;
    console.log({ tsA, tsB });

    tsB = bookB[0].time_exchange;
    bookB = bookB.filter(
        (el) => Date.parse(el.time_exchange) > Date.parse(tsA)
    );

    tsA = bookA[0].time_exchange;
    tsB = bookB[0].time_exchange;

    const trades: { ts: string; perc: number }[] = [];

    console.log({ tsA, tsB }, "\n");

    let lastTsA = 0;
    let lastTsB = 0;
    let lastTsC = 0;
    const A = 1;
    let bal = 50;
    const START_BAL = bal;

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    for (let i = 0; i < bookA.length; i++) {
        try {
            const rowA = bookA[i];
            const rowB = bookB[i];

            const tsA = rowA.time_exchange;
            const tsB = rowB.time_exchange;

            const tsMsA = Date.parse(tsA);
            const tsMsB = Date.parse(tsB);

            const tsCond =
                tsMsA >= lastTsA + interval * 1000 &&
                tsMsB >= lastTsB + interval * 1000;

            if (!rowA || !rowB) continue;
            const askA = rowA.asks[0].price;
            const bidA = rowA.bids[0].price;
            const askB = rowB.asks[0].price;
            const bidB = rowB.bids[0].price;

            if (tsCond) {
                const buyPx = askA,
                    sellPx = bidB;
                console.log("\n", { ts: tsA, buyPx, sellPx }, "\n");
                lastTsA = tsMsA;
                lastTsB = tsMsB;

                const A2 = (A * sellPx) / buyPx;

                const perc = ceil(((A2 - A) / A) * 100, 3);

                //console.log("\n", { tsA, tsB, tsC });

                console.log("\n", { perc: `${perc}%`, A2 });

                let _quote = 0,
                    _base = 0;
                if (perc >= minPerc) {
                    _base = bal / buyPx; // BUY at c
                    _base = toFixed(_base * (1 - TAKER), 10);
                    _quote = _base * sellPx; // SELL AT B
                    _quote = toFixed(_quote * (1 - MAKER), 10);
                    console.log("\n", { _quote }, "\n");

                    bal = _quote;
                    trades.push({ ts: tsA, perc });
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

const BDX_START = "2024-03-13 13:00:00+02:00",
    BDX_END = "2024-03-14 00:00:00+02:00";
// runCross({
//     symbol: "BDX_USDT",
//     platA: "mexc",
//     platB: "kucoin",
//     start: BDX_START,
//     end: BDX_END,
//     minPerc: 0.3,
// });

const C = "CAS";

runTri({
    minPerc: 0.5,
    plat: "kucoin",
    A: "USDT",
    B: "BTC",
    C,
    ...coinApiDates[C],
});
