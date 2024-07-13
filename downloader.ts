import { OKX } from "@/classes/okx";

import { Bot } from "@/models";
import {
    dfsDir,
    dfsRootDir,
    klinesDir,
    klinesRootDir,
    tradesRootDir,
} from "@/utils/constants";
import { ensureDirExists } from "@/utils/orders/funcs";
import {
    chandelierExit,
    heikinAshi,
    parseDate,
    parseKlines,
    tuPath,
} from "@/utils/funcs2";

import { readJson } from "@/utils/functions";

import { existsSync, readdirSync, writeFileSync } from "fs";
import { TestBinance } from "@/classes/test-binance";
import { TestBybit, TestOKX } from "@/classes/test-platforms";
import { ITrade } from "@/utils/interfaces";
let years = [2021, 2023],
    symbols = ["SOL", "NEAR", "MASK", "MINA"],
    intervals = [3, 5];
symbols = symbols.map((el) => `${el}/USDT`);

async function downloader({
    symbol,
    start,
    end,
    interval,
    platNm = "binance",
}: {
    start: string;
    end: string;
    symbol: string;
    interval: number;
    platNm?: "binance" | "okx" | "bybit";
}) {
    const symbArr = symbol.split("/");

    const fname = `${symbArr.join(
        "-"
    )}_${interval}m_${start}_${end}.json`.replace(/[\/|\\:*?"<>]/g, " ");
    console.log(fname);
    const fpath = tuPath(`${klinesRootDir}/${platNm}/${fname}`);
    ensureDirExists(fpath);

    symbol = platNm == "okx" ? symbArr.join("-") : symbArr.join("");

    const plat =
        platNm == "okx"
            ? new TestOKX()
            : platNm == "bybit"
            ? new TestBybit()
            : new TestBinance();

    await plat.getKlines({
        symbol: symbol,
        start: Date.parse(start),
        end: Date.parse(end),
        interval,
        savePath: fpath,
    });

    console.log("DONE DOWNLOADING KLINES");
}

const dld = async ({
    parse = false,
    platNm = "binance",
}: {
    parse?: boolean;
    platNm?: "binance" | "okx" | "bybit";
}) => {
    const bin = new TestBinance();
    for (let year of years) {
        for (let symb of symbols) {
            for (let interval of intervals) {
                console.log(`\nDownloading ${symb}, ${year}, ${interval}m\n`);

                const msymb = symb.split("/");

                symb = platNm == "okx" ? msymb.join("-") : msymb.join("");
                const fname = `${symb}_${interval}m.json`;
                const klinesPath = `${klinesRootDir}/${platNm}/${year}/${fname}`;
                const dfsPath = `${dfsRootDir}/${platNm}/${year}/${fname}`;
                if (existsSync(klinesPath)) {
                    console.log(`\n${klinesPath} EXISTS. SKIPPING...\n`);
                    continue;
                }
                ensureDirExists(klinesPath);
                const bot = new Bot({
                    name: "TBOT",
                    base: msymb[0],
                    ccy: msymb[1],
                    interval,
                });
                const plat =
                    platNm == "okx"
                        ? new TestOKX()
                        : platNm == "bybit"
                        ? new TestBybit()
                        : new TestBinance();
                const month =
                    platNm == "okx" ? (year < 2022 ? "07" : "01") : "01";
                let klines = await plat.getKlines({
                    symbol: symb,
                    start: Date.parse(`${year}-${month}-01 00:00:00+02:00`),
                    end: Date.parse(`${year}-12-31 23:59:00+02:00`),
                    interval,
                    savePath: klinesPath,
                });
                if (parse && klines) {
                    const df = chandelierExit(
                        heikinAshi(parseKlines(klines), [bot.base, bot.ccy])
                    );
                    ensureDirExists(dfsPath);
                    writeFileSync(dfsPath, JSON.stringify(df));
                }
                console.log(`Done with interval=${interval}\n`);
            }
            console.log(`Done with symbol=${symb}\n`);
        }
        console.log(`Done with year=${year}\n`);
    }
};

const createDf = async (year: number, interval: number, symb: string) => {
    const fname = `${symb}_${interval}m.json`;
    const klinesPath = `${klinesDir}/${year}/${fname}`;
    const dfsPath = `${dfsDir}/${year}/${fname}`;

    console.log(`Begin: ${year}, ${interval}m, ${symb}\n`);
    if (!existsSync(klinesPath)) {
        console.log("KLINES DO NOT EXISTS");
        return;
    }

    const klines = readJson(klinesPath);
    const df = chandelierExit(heikinAshi(parseKlines(klines), []));
    ensureDirExists(dfsPath);
    writeFileSync(dfsPath, JSON.stringify(df));
};

const klinesToDf = async (fp: string, saveFp: string) => {
    if (!existsSync(fp)) {
        console.log("KLINES DO NOT EXISTS");
        return;
    }
    const klines = readJson(fp);
    const df = chandelierExit(heikinAshi(parseKlines(klines), []));
    ensureDirExists(saveFp);
    writeFileSync(saveFp, JSON.stringify(df));
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

const getTrades = async ({symbol, start, end, platNm = "binance"}: {symbol: string, platNm?: string, start: number, end: number}) => {
    const startDate = parseDate(new Date(start))
    const endDate = parseDate(new Date(end))
    const year = startDate.split('-')[0]
    const plat = new TestBinance();
    const savePath = tradesRootDir + `/${platNm}/${year}/${symbol}_${start}-${end}.json`
    console.log({savePath});
    const r = await plat.getTrades({
        symbol,
        start, end, savePath 
    });
    console.log(r[0], r[r.length - 1]);
};
//dld({platNm: 'binance'})
//createDf(2024,15,"SOLUSDT")
//afterKlines()

async function test() {
    /* const klines = await bin.getKlines("SOLUSDT", undefined, Date.parse("2024-06-04 14:47:00+02:00"))
    console.log(chandelierExit(heikinAshi(parseKlines(klines!)))[klines!.length - 1]) */
}
//downloader({platNm: 'okx',symbol: 'SOL/USDT', start: '2024-07-07 00:00:00+02:00', end: '2024-10-20 23:59:00+02:00', interval: 15})

const fp =
    "src/data/klines/binance/SOL-USDT_15m_2024-05-01 00 00 00+02:00_2024-06-11 23 59 00+02:00.json";
const saveFp =
    "src/data/dfs/binance/SOL-USDT_15m_2024-05-01 00 00 00+02:00_2024-06-11 23 59 00+02:00.json";
//klinesToDf(fp, saveFp)

//getTrades({symbol: "SOLUSDT", start: Date.parse("2021-01-02 00:00:00+02:00"), end: Date.parse("2021-01-02 23:59:00+02:00") });

const mergeTrades = ({symbol, start, platNm = "binance"}: {symbol: string, start: number, platNm?: string }) =>{
    const startDate = parseDate(new Date(start))
    const year = startDate.split('-')[0]

    const dir = `${tradesRootDir}/${platNm}/${year}`
    if (!existsSync(dir))
        return console.log(`${dir} DOES NOT EXIST`);

    const finalPath = `${dir}/trades.json`
    let trades : ITrade[] = []

    for (let file of readdirSync(dir)){
        if (file.startsWith(symbol)){
          console.log(file);
        const json: ITrade[] = require(`${dir}/${file}`)
        trades = [...trades, ...json].sort((a, b)=> Date.parse(a.ts) - Date.parse(b.ts))
        writeFileSync(finalPath, JSON.stringify(trades))
        console.log("SAVED\n");  
        }
        
    }
    console.log("DONE MERGING TRADES");
}

mergeTrades({symbol: "SOLUSDT", start: Date.parse("2021-01-02 00:00:00+02:00")})