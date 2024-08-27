import { existsSync, writeFileSync } from "fs";
import { parseDate, parseKlines } from "@/utils/funcs2";

import { Arbit } from "@/bots/arbitrage/classes";
import { getInstrus, getKlinesPath } from "@/utils/funcs3";
import {
    getPricePrecision,
    readJson,
    getCoinPrecision,
    clearTerminal,
    findAve,
    toFixed,
    getSymbol,
} from "@/utils/functions";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { bybitInstrus } from "@/utils/data/instrus/bybit-instrus";
import { ensureDirExists } from "@/utils/orders/funcs";
import { ARBIT_ZERO_FEES, XRP_WITHDRAW_FEE } from "@/utils/constants";
import { IObj } from "@/utils/interfaces";
import { binanceInstrus } from "@/utils/data/instrus/binance-instrus";
import { binanceBTCBases } from "@/utils/data/binance-bases";
// BYBIT, BINANCE 15min PEPE works
// BYBIT, BINANCE 15min UMA works

const coin = {
    pair: ["THETA", "USDT"],
    fee: { base: 0.24, quote: XRP_WITHDRAW_FEE },
};

const ethBases = [
    "AAVE",
    "ADA",
    "ADX",
    "APE",
    "APT",
    "ARB",
    "ATOM",
    "AVAX",
    "AXS",
    "BNB",
    "BNT",
    "CHR",
    "CYBER",
    "DASH",
    "DENT",
    "DOT",
    "EGLD",
    "ELF",
    "ENJ",
    "EOS",
    "ETC",
    "FIL",
    "FTM",
    "GALA",
    "GRT",
    "HOT",
    "ICP",
    "INJ",
    "IOTA",
    "IOTX",
    "LINK",
    "LRC",
    "LSK",
    "LTC",
    "MANA",
    "MATIC",
    "NEAR",
    "OP",
    "POWR",
    "QTUM",
    "RLC",
    "ROSE",
    "RUNE",
    "SC",
    "SLP",
    "SNT",
    "SOL",
    "SSV",
    "STEEM",
    "THETA",
    "TRX",
    "UNI",
    "VET",
    "WBETH",
    "WBTC",
    "XLM",
    "XRP",
    "XVG",
    "ZEC",
    "ZEN",
    "ZIL",
];

const bybitBTCBases = [
    "ALGO",
    "DOT",
    "ETH",
    "LTC",
    "MANA",
    "MATIC",
    "MNT",
    "SAND",
    "SOL",
    "WBTC",
    "XLM",
    "XRP",
];

clearTerminal();
let g_data: { pair: string; profit: number; trades: number }[] = [];

async function run({
    A = "USDT",
    B = "ETH",
    C,
    _plat,
    save,
}: {
    A?: string;
    B?: string;
    C?: string;
    _plat?: string;
    save?: boolean;
}) {
    const one = false;
    const data = {
        plat: _plat ?? "binance",
        interval: 5,
        start: "2024-01-01 00:00:00+02:00",
        end: "2024-10-28 23:59:00+02:00",
        save: !one,
        demo: false,
        join: false,
        bal: 50,
        prefix: "MED-THETA",
        pairA: [B!, A!], //pairA:  ["BTC", "USDT"],
        pairB: [C!, B!], //pairB: ["PAXG", "BTC"],
        pairC: [C!, A!], //pairC: ["PAXG", "USDT"]
    };

    let {
        plat,
        interval,
        start,
        end,
        demo,
        bal,
        join,
        prefix,
        pairA,
        pairB,
        pairC,
    } = data;

    save = save != undefined ? save : data.save;
    prefix = prefix ? `${prefix}_` : "";

    const MAKER = ARBIT_ZERO_FEES ? 0 : 0.1 / 100,
        TAKER = ARBIT_ZERO_FEES ? 0 : 0.1 / 100;
    const QUOTE_FEE = 0,
        BASE_FEE = 0;
    let msg = "";

    const year = Number(start.split("-")[0]);

    let trades = 0;
    const START_BAL = bal;
    let _data: { pair: string[]; profit: number; trades: number }[] = [];
    let last: string[] | undefined;
    let gains: number[] = [];

    const savePath = `_data/rf/arbit-tri/${plat}/${year}/${prefix}${pairA.join(
        "-"
    )}_${pairB.join("-")}_${pairC.join("-")}_${interval}m.json`;

    ensureDirExists(savePath);

    const _save = () => {
        if (save) {
            writeFileSync(savePath, JSON.stringify(_data));
            console.log("SAVED\n");
        }
    };

    const klinesPathA = getKlinesPath({
        plat,
        interval,
        year,
        pair: pairA,
        demo,
    });
    const klinesPathB = getKlinesPath({
        plat,
        interval,
        year,
        pair: pairB!,
        demo,
    });
    const klinesPathC = getKlinesPath({
        plat,
        interval,
        year,
        pair: pairC!,
        demo,
    });

    if (!existsSync(klinesPathA)) {
        return console.log(`${klinesPathA} DOES NOT EXIST`);
    }
    if (!existsSync(klinesPathB)) {
        return console.log(`${klinesPathB} DOES NOT EXIST`);
    }
    if (!existsSync(klinesPathC)) {
        return console.log(`${klinesPathC} DOES NOT EXIST`);
    }

    const ksA = await readJson(klinesPathA);
    const ksB = await readJson(klinesPathB);
    const ksC = await readJson(klinesPathC);

    let dfA = parseKlines(ksA ?? []);
    let dfB = parseKlines(ksB ?? []);
    let dfC = parseKlines(ksC ?? []);

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

    const iLen = Math.min(dfA.length, dfB.length, dfC.length);

    for (let i = 0; i < iLen; i++) {
        const rowA = dfA[i];
        const rowB = dfB[i];
        const rowC = dfC[i];

        const A = rowA.o;
        const B = rowB.o;
        const C = rowC.o;

        console.log("\n", { a: rowA.ts, b: rowB.ts, c: rowC.ts });
        let _quote = 0;
        let perc = 0;

        const flipped = false;
        if (flipped) {
            const baseC = (bal / rowC.o) * (1 - TAKER);
            const quoteB = baseC * rowB.o * (1 - MAKER);
            _quote = quoteB * rowA.o * (1 - MAKER);
        } else {
            const _amt = 1;
            const _B = _amt / A; //  BUY B WITH A
            const _C = _B / B; // BUY C WITH B
            const _A = _C * C; // SELL C FOR A
            // 242.660
            perc = Number((((_A - _amt) / _amt) * 100).toFixed(2));
            console.log({ _amt, _A, perc });
            const baseA = (bal / rowA.o) * (1 - TAKER);
            const baseB = (baseA / rowB.o) * (1 - TAKER);
            _quote = baseB * rowC.o * (1 - MAKER);
        }

        console.log({ perc: `${perc}%` });

        if (perc >= 0.2) {
            console.log("GOING IN...");
            bal = toFixed(_quote, 2);
            console.log({ bal, START_BAL });
            trades += 1;
        }
        if (perc >= 0) {
            gains.push(perc);
        }
    }

    _data = [..._data].sort((a, b) => (a.profit > b.profit ? -1 : 1));
    _save();

    const prAves = findAve(gains);
    const profit = toFixed(bal - START_BAL, 2);

    const symbo = getSymbol([C!, B!], "okx");
    g_data.push({ pair: symbo, profit, trades });
    g_data = [...g_data].sort((a, b) => (a.profit > b.profit ? -1 : 1));

    if (save) {
        const saveFp = `_data/rf/arbit-tri/coins/${plat}/${year}/${B}_${interval}m.json`;
        ensureDirExists(saveFp);
        writeFileSync(saveFp, JSON.stringify(g_data));
        console.log("SAVED");
    }

    console.log("\nALL DONE");
    console.log({ bal, profit, trades, prAves });
}

console.log("PID:", process.pid);
const fn = async () => {
    const bases = ["MANA"]; // binanceBTCBases//bybitBTCBases
    for (let base of bases) {
        console.log("\nBEGIN BASE:", base);
        await run({ C: base, B: "BTC", _plat: "bybit", save: false });
    }
};

const B = "BTC";
// const symbos = binanceInstrus.filter(el=> el.status == 'TRADING' && el.quoteAsset == B && el.isSpotTradingAllowed).map(el=> el.baseAsset).sort()
// writeFileSync(`_data/binance-${B}-coins.json`, JSON.stringify(symbos))
// console.log("symbos")

// const symbos = bybitInstrus.filter(el=> el.status == 'Trading' && el.quoteCoin == B).map(el=> el.baseCoin).sort()
// writeFileSync(`_data/bybit-${B}-coins.json`, JSON.stringify(symbos))
// console.log("symbos")

fn();
