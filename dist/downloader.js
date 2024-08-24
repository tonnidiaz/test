"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("@/models");
const constants_1 = require("@/utils/constants");
const funcs_1 = require("@/utils/orders/funcs");
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const fs_1 = require("fs");
const consts_1 = require("@/utils/consts");
const dld = async ({ parse = false, platNm = "binance", demo = false, symbols, intervals, years, skip }) => {
    symbols = symbols.map((el) => el.includes('/') ? el : `${el}/USDT`);
    for (let year of years) {
        for (let symb of symbols) {
            for (let interval of intervals) {
                console.log(`\nDownloading ${symb}, ${year}, ${interval}m\n`);
                const pair = symb.split("/");
                console.log({ msymb: pair });
                symb = (0, functions_1.getSymbol)(pair, platNm);
                const fname = `${symb}_${interval}m.json`;
                const klinesPath = `${constants_1.klinesRootDir}/${platNm}/${year}/${fname}`;
                const dfsPath = `${constants_1.dfsRootDir}/${platNm}/${year}/${fname}`;
                if (skip && (0, fs_1.existsSync)(klinesPath)) {
                    console.log(`\n${klinesPath} EXISTS. SKIPPING...\n`);
                    continue;
                }
                (0, funcs_1.ensureDirExists)(klinesPath);
                const bot = new models_1.Bot({
                    name: "TBOT",
                    base: pair[0],
                    ccy: pair[1],
                    interval,
                });
                const plat = new consts_1.platforms[platNm]({ demo });
                const month = platNm == "okx" ? (year < 2022 ? "07" : "01") : "01";
                let klines = await plat.getKlines({
                    symbol: symb,
                    start: Date.parse(`${year}-${month}-01 00:00:00+02:00`),
                    end: Date.parse(`${year}-12-31 23:59:00+02:00`),
                    interval,
                    savePath: klinesPath,
                });
                if (parse && klines) {
                    const df = (0, funcs2_1.tuCE)((0, funcs2_1.heikinAshi)((0, funcs2_1.parseKlines)(klines)));
                    (0, funcs_1.ensureDirExists)(dfsPath);
                    (0, fs_1.writeFileSync)(dfsPath, JSON.stringify(df));
                }
                console.log(`Done with interval=${interval}\n`);
            }
            console.log(`[ ${symb} ] Done with symbol=${symb}\n`);
        }
        console.log(` Done with year=${year}\n`);
    }
};
const createDf = async (year, interval, symb) => {
    const fname = `${symb}_${interval}m.json`;
    const klinesPath = `${constants_1.klinesDir}/${year}/${fname}`;
    const dfsPath = `${constants_1.dfsDir}/${year}/${fname}`;
    console.log(`Begin: ${year}, ${interval}m, ${symb}\n`);
    if (!(0, fs_1.existsSync)(klinesPath)) {
        console.log("KLINES DO NOT EXISTS");
        return;
    }
    const klines = (0, functions_1.readJson)(klinesPath);
    const df = (0, funcs2_1.tuCE)((0, funcs2_1.heikinAshi)((0, funcs2_1.parseKlines)(klines)));
    (0, funcs_1.ensureDirExists)(dfsPath);
    (0, fs_1.writeFileSync)(dfsPath, JSON.stringify(df));
};
const klinesToDf = async (fp, saveFp) => {
    if (!(0, fs_1.existsSync)(fp)) {
        console.log("KLINES DO NOT EXISTS");
        return;
    }
    const klines = (0, functions_1.readJson)(fp);
    const df = (0, funcs2_1.tuCE)((0, funcs2_1.heikinAshi)((0, funcs2_1.parseKlines)(klines)));
    (0, funcs_1.ensureDirExists)(saveFp);
    (0, fs_1.writeFileSync)(saveFp, JSON.stringify(df));
    console.log("DONE WRITING DF");
};
function afterKlines() {
    for (let year of years) {
        for (let interval of intervals) {
            for (let symb of symbols) {
                createDf(year, interval, symb);
            }
        }
    }
}
const getTrades = async ({ symbol, start, end, platNm = "binance" }) => {
    const startDate = (0, funcs2_1.parseDate)(new Date(start));
    const endDate = (0, funcs2_1.parseDate)(new Date(end));
    const year = startDate.split('-')[0];
    const plat = new consts_1.platforms[platNm].obj({});
    const savePath = constants_1.tradesRootDir + `/${platNm}/${year}/${symbol}_${start}-${end}.json`;
    console.log({ savePath });
    const r = await plat.getTrades({
        symbol,
        start, end, savePath
    });
    console.log(r[0], r[r.length - 1]);
};
async function test() {
    /* const klines = await bin.getKlines("SOLUSDT", undefined, Date.parse("2024-06-04 14:47:00+02:00"))
    console.log(chandelierExit(heikinAshi(parseKlines(klines!)))[klines!.length - 1]) */
}
//downloader({platNm: 'okx',symbol: 'SOL/USDT', start: '2024-07-07 00:00:00+02:00', end: '2024-10-20 23:59:00+02:00', interval: 15})
const fp = "src/data/klines/binance/SOL-USDT_15m_2024-05-01 00 00 00+02:00_2024-06-11 23 59 00+02:00.json";
const saveFp = "src/data/dfs/binance/SOL-USDT_15m_2024-05-01 00 00 00+02:00_2024-06-11 23 59 00+02:00.json";
//klinesToDf(fp, saveFp)
const mergeTrades = ({ symbol, year, platNm = "binance" }) => {
    const dir = `${constants_1.tradesRootDir}/${platNm}/${year}`;
    if (!(0, fs_1.existsSync)(dir))
        return console.log(`${dir} DOES NOT EXIST`);
    const finalPath = `${dir}/trades.json`;
    let trades = [];
    for (let file of (0, fs_1.readdirSync)(dir)) {
        if (file.startsWith(symbol)) {
            console.log(file);
            const json = require(`${dir}/${file}`);
            trades = [...trades, ...json].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
            (0, fs_1.writeFileSync)(finalPath, JSON.stringify(trades));
            console.log("SAVED\n");
        }
    }
    console.log("DONE MERGING TRADES");
};
//mergeTrades({symbol: "SOLUSDT", year: 2021})
//getTrades({symbol: "SOLUSDT", start: Date.parse("2021-01-03 00:31:18+02:00"), end: Date.parse("2021-01-10 23:59:00+02:00") });
let years = [2024], symbols = ["TURBOS", "PEPE", "FLOKI", ""], //["GSTS", "PLY", "SOL", "ELT"],
intervals = [60];
dld({ platNm: 'bybit', symbols, years, intervals, skip: true });
//createDf(2024,15,"SOLUSDT")
//afterKlines()
