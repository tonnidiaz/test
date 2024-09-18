import { coinApiDates } from "@/utils/consts2";
import { parseDate } from "@/utils/funcs2";
import { getLastItem } from "@/utils/funcs3";
import {
    ceil,
    clearTerminal,
    encodeDate,
    existsSync,
    getSymbol,
    readJson,
    sleep,
    toFixed,
} from "@/utils/functions";
import { IObj, TPlatName } from "@/utils/interfaces";
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

    let bookA = await readJson(pathA);
    let bookB = await readJson(pathB);
    let bookC = await readJson(pathC);

    let bal = 50;
    const START_BAL = bal;

    const trades: { ts: string; perc: number; flipped: boolean }[] = [];

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    const gap = 30; // Single trade exec time in secs
    const lastTsMsA = Date.parse(getLastItem(bookA).time_exchange);
    const lastTsMsB = Date.parse(getLastItem(bookB).time_exchange);
    const lastTsMsC = Date.parse(getLastItem(bookC).time_exchange);
    const startTsA = bookA[0].time_exchange,
        startTsB = bookB[0].time_exchange,
        startTsC = bookC[0].time_exchange;

    console.log({
        startTsA,
        startTsB,
        startTsC,
    });
    console.log(
        {
            lastTsA: getLastItem(bookA).time_exchange,
            lastTsB: getLastItem(bookB).time_exchange,
            lastTsC: getLastItem(bookC).time_exchange,
        },
        "\n"
    );

    const biggestStartTs = Math.max(
        Date.parse(startTsA),
        Date.parse(startTsB),
        Date.parse(startTsC)
    );

    const endAt = Math.min(lastTsMsA, lastTsMsB, lastTsMsC);
    const startAt = false
        ? Date.parse("2024-06-14 10:20:29+02:00")
        : biggestStartTs; //getTsMs(bookA[0]);
    let lastTs = startAt;

    let pos = false,
        flipped = false;

    let entryLimit: number | undefined;
    let entryLimit2: number | undefined;
    let exitLimit: number | undefined;
    let exitLimit2: number | undefined;
    let base = 0;

    const _closePos = () => {
        tradesCnt += 1;
        exitLimit = undefined;
        exitLimit2 = undefined;
        entryLimit = undefined;
        entryLimit2 = undefined;
        pos = false;
        console.log("\nPOS CLOSED!!\n");
    };
    let tradesCnt = 0;
    while (lastTs <= endAt) {
        await sleep(.0001);
        console.log({ ts: parseDate(lastTs) }, "\n");
        const ts = lastTs;
        

        const estRowA = getLastItem(bookA.filter((el) => getTsMs(el) <= ts));
        const estRowB = getLastItem(bookB.filter((el) => getTsMs(el) <= ts));
        const estRowC = getLastItem(bookC.filter((el) => getTsMs(el) <= ts));

        const estAskA = estRowA.asks[0].price;
        const estAskB = estRowB.asks[0].price;
        const estAskC = estRowC.asks[0].price;

        const estBidA = estRowA.bids[0].price;
        const estBidB = estRowB.bids[0].price;
        const estBidC = estRowC.bids[0].price;

        const A2 = estBidC / (estAskA * estAskB);
        const perc = ceil(((A2 - AMT) / AMT) * 100, 3);
        const fA2 = (estBidB * estBidA) / estAskC;
        const fperc = ceil(((fA2 - AMT) / AMT) * 100, 3);
        //if (!pos && perc < 0 && fperc < 0) continue;
        console.log("\n", { perc: `${perc}%`, A2 });
        console.log({ fperc: `${fperc}%`, fA2 });

        const _perc = Math.max(perc, fperc);
        const _flipped = fperc > perc;

        if (_perc >= minPerc && !pos) {
            console.log("GOING IN...\n");
            flipped = _flipped;
            if (flipped) {
                exitLimit = estBidB;
                exitLimit2 = estBidA;
            } else {
                entryLimit2 = estAskB;
                exitLimit = estBidC;
            }

            const buyPx = flipped ? estAskC : estAskA;
            base = toFixed((bal / buyPx) * (1 - TAKER), 10);
            pos = true;
            lastTs += gap * 1000;
        } else if (pos) {
            console.log(
                "HAS POS",
                { flipped, entryLimit, entryLimit2, exitLimit, exitLimit2 },
                "\n"
            );
            if (flipped) {
                if (exitLimit) {
                    //SELL AT B
                    const sellPx = estBidB;
                    base = toFixed(base * sellPx * (1 - MAKER), 10);
                    exitLimit = undefined;
                } else if (exitLimit2) {
                    //SELL AT A
                    const sellPx = estBidA;
                    bal = toFixed(base * sellPx * (1 - MAKER), 10);

                    // Close pos
                    _closePos();
                }
            } else {
                if (entryLimit2) {
                    //BUY AT B
                    const buyPx = estAskB;
                    base = toFixed((base / buyPx) * (1 - TAKER), 10);
                    entryLimit2 = undefined;
                } else if (exitLimit) {
                    //SELL AT C
                    const sellPx = estBidC;
                    bal = toFixed(base * sellPx * (1 - MAKER), 10);

                    // Close pos
                    _closePos();
                }
            }
            lastTs += gap * 1000;
        }else{
            lastTs += 30 * 1000
        }
    }
    const profit = bal - START_BAL;

    console.log("\n", { trades: tradesCnt, profit });
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
    const orders: {
        ts: string;
        side: string;
        px: number;
        estPx: number;
        perc?: number;
        estPerc?: number;
    }[] = [];
    const trades: { ts: string; perc: number }[] = [];

    let bal = 50;
    const START_BAL = bal;

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    // sell at next row
    const gap = 10; // Transfer time in minutes
    console.log({
        lastTsA: getLastItem(bookA).time_exchange,
        lastTsB: getLastItem(bookB).time_exchange,
    });
    const endAt = getTsMs(getLastItem(bookA));
    const startAt = getTsMs(bookA[0]);
    let lastTs = startAt;

    let pos = false;
    let base = 0;
    let entryLimit = 0,
        exitLimit = 0;
    let buyPx = 0, sellPx = 0;
    while (lastTs <= endAt) {
        await sleep(.0001);
        console.log({ ts: parseDate(lastTs) }, "\n");
        const ts = lastTs;

        const estBuyRow = getLastItem(bookA.filter((el) => getTsMs(el) <= ts));
        const estSellRow = getLastItem(bookB.filter((el) => getTsMs(el) <= ts));
        const estBuyPx = estBuyRow.asks[0].price;
        const estSellPx = estSellRow.bids[0].price;

        const estBuyTs = parseDate(estBuyRow.time_exchange);
        const estSellTs = parseDate(estSellRow.time_exchange);

        const A2 = (AMT * estSellPx) / estBuyPx;
        const estPerc = ceil(((A2 - AMT) / AMT) * 100, 2);

        console.log(
            {
                estBuyTs,
                estSellTs,
                estPerc: `${estPerc}%`,
                estBuyPx,
                estSellPx,
            },
            "\n"
        );

        if (!pos && estPerc >= minPerc) {
            console.log("BUY");
            entryLimit = estBuyPx;
            exitLimit = estSellPx;
            buyPx = estBuyRow.asks[0].price;
            base = toFixed((bal / buyPx) * (1 - TAKER), 10);

            console.log({ entryLimit, buyPx });
            console.log("WITHDRAW\n");
            orders.push({
                ts: parseDate(ts),
                px: buyPx,
                estPx: estBuyPx,
                side: "buy",
            });

            pos = true;
            lastTs += gap * 60000;
        } else if (pos && estSellPx >= buyPx) {
            console.log("SELL");
            sellPx = estSellPx;
            console.log({ exitLimit, sellPx });
            bal = toFixed(base * sellPx * (1 - MAKER), 2);
            console.log("WITHDRAW\n");
            orders.push({
                ts: parseDate(ts),
                px: sellPx,
                estPx: estSellPx,
                side: "sell",
            });
            pos = false;
            lastTs += gap * 60000;
        } else {
            lastTs += 60 * 1000;
        }
    }

    const profit = bal - START_BAL;
    console.log("\n", { trades: Math.floor(orders.length / 2), profit });
    //console.log(trades);
};

const runKlines = async ({
    minPerc,
    start,
    end,
    platA,
    platB,
    pair,
    pre,
}: {
    minPerc: number;
    platA: TPlatName;
    platB?: TPlatName;
    pair: string[],
    start: string;
    end: string;
    pre?: string;
}) => {
    pre = pre ? pre + "_" : "";
    const symbolA =  pair[0] + `_${pair[1]}`//getSymbol(pair, plat)
    console.log("\nBEGIN", { symbol: symbolA }, "\n");
    const symbolIdA = platA.toUpperCase() + "_SPOT_" + symbolA;
    const symbolIdB = !platB ? undefined : platB.toUpperCase() + "_SPOT_" + symbolA;

    const pathA = genFname({ symbolId: symbolIdA, start, end, pre, plat: platA });
    const pathB = !symbolIdB ? undefined : genFname({ symbolId: symbolIdB, start, end, pre, plat: platB as any });

    let bookA = await readJson(pathA);
    let bookB =!pathB ? undefined : await readJson(pathB);

    let bal = 50;
    const START_BAL = bal;

    const trades: { ts: string; perc: number; flipped: boolean }[] = [];

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    const interval = .5; // minutes
    const lastTsMs = Date.parse(getLastItem(bookA).time_exchange);
        const startTs = bookA[0].time_exchange;
    console.log({
        startTs
    });
    console.log(
        {
            lastTs: getLastItem(bookA).time_exchange,
        },
        "\n"
    );

    const biggestStartTs = Date.parse(startTs) + interval * 60000
    console.log(startTs + 60);
    const endAt = Math.min(lastTsMs);
    const startAt = false
        ? Date.parse("2024-06-14 10:20:29+02:00")
        : biggestStartTs; //getTsMs(bookA[0]);
    let lastTs = startAt;

    let pos = false,
        flipped = false;

    let entryLimit: number | undefined;
    let exitLimit: number | undefined;
    let base = 0;

    const _closePos = () => {
        tradesCnt += 1;
        exitLimit = undefined;
        entryLimit = undefined;
        pos = false;
        console.log("\nPOS CLOSED!!\n");
    };
    let tradesCnt = 0;
    let buyPx = 0, sellPx = 0;

    while (lastTs <= endAt) {
        await sleep(.0001);
        console.log({ ts: parseDate(lastTs) }, "\n");
        const ts = lastTs;
        lastTs += interval * 60000

        const estRowA = getLastItem(bookA.filter((el) => getTsMs(el) <= ts));
        const estRowB = !bookB ? undefined :getLastItem(bookB.filter((el) => getTsMs(el) <= ts));
        const estPrevRow = getLastItem(bookA.filter((el) => getTsMs(el) <= ts - interval * 60000));
        const estAskA = estRowA.asks[0].price;
        const estBidA = estRowA.bids[0].price;

        const estAskB : number | undefined = estRowB?.asks[0].price;
        const estBidB : number | undefined = estRowB?.bids[0].price;

        const estPrevAsk = estPrevRow.asks[0].price;
        const estPrevBid = estPrevRow.bids[0].price;

        if (!pos) {
            console.log("GOING IN...\n");

            buyPx = estAskA;
            base = toFixed((bal / buyPx) * (1 - TAKER), 10);
            pos = true;
            exitLimit = Math.max(estPrevBid, estPrevAsk) * ( 1 +1.5/100)
        } else if (pos && exitLimit) {
            console.log(
                "HAS POS",
                { exitLimit, estBid: estBidA, buyPx},
                "\n"
            );
            sellPx = 0
            const minTP = buyPx * (1 + .5/100)
            const sl = buyPx * (1 - .1/100)
            const estBid = Math.max(estBidA, estBidB ?? 0)
            if (estBid >= minTP){
                sellPx = estBid
            }
            else if (estBid >= exitLimit){
                sellPx = exitLimit
            }
            else if(estBid >= sl){
                sellPx = estBid
            }

            if (sellPx != 0){
                console.log("SELLING")
                bal = toFixed(base * sellPx * (1 - MAKER), 10)
                _closePos()
            }
        }

    }
    const profit = bal - START_BAL;

    console.log("\n", { trades: tradesCnt, profit });
};

const BDX_START = "2024-03-13 13:00:00+02:00",
    BDX_END = "2024-03-14 00:00:00+02:00";

let side = 'tri' as  'tri' | 'cross' | 'klines';

const C = "SAGA";

if (side == 'cross')
    runCross({
        symbol: C + "_USDT",
        platA: "mexc",
        platB: "kucoin",
        start: coinApiDates[C].start,
        end: coinApiDates[C].end,
        minPerc: -0.5,
    });
else if (side == 'tri')
    runTri({
        minPerc: 0.1,
        plat: "binance",
        A: "USDT",
        B: "USDC",
        C,
        ...coinApiDates[C],
    });
else if (side == 'klines'){
    runKlines({
        minPerc: .4, platA: 'mexc', platB: "bitget", ...coinApiDates[C], pair: [C, 'USDT']
    })
}