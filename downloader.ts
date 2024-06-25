import { OKX } from "@/classes/okx";

import { Bot } from "@/models";
import { dfsDir, dfsRootDir, klinesDir, klinesRootDir } from "@/utils/constants";
import { ensureDirExists } from "@/utils/orders/funcs";
import {
    chandelierExit,
    heikinAshi,
    parseDate,
    parseKlines,
    tuPath,
} from "@/utils/funcs2";

import { readJson } from "@/utils/functions";

import { existsSync, writeFileSync } from "fs";
import { TestBinance } from "@/classes/test-binance";
import { TestBybit, TestOKX } from "@/classes/test-platforms";
let years = [2021,2022,2023,2024],
    symbols = [ 'UMA', 'PEOPLE', 'DOGE'],
    intervals = [60];
symbols = symbols.map(el=> `${el}/USDT`)

async function downloader({
    symbol,
    start,
    end,
    interval,
    platNm = 'binance'
}: {
    start: string;
    end: string;
    symbol: string;
    interval: number;
    platNm?: 'binance' | 'okx' | 'bybit';
}) {
    const symbArr = symbol.split("/");

    const fname = `${symbArr.join('-')}_${interval}m_${start}_${end}.json`.replace(/[\/|\\:*?"<>]/g, " ");
    console.log(fname);
    const fpath = tuPath(`${klinesRootDir}/${platNm}/${fname}`);
    ensureDirExists(fpath);

    symbol = platNm == 'okx' ? symbArr.join("-") : symbArr.join("");

    const plat = platNm == 'okx' ? new TestOKX() : platNm == 'bybit' ? new TestBybit() : new TestBinance()

    await plat.getKlines({
        symbol: symbol,
        start: Date.parse(start),
        end: Date.parse(end),
        interval, savePath: fpath
    });

    console.log("DONE DOWNLOADING KLINES");
}

const dld = async ({
    parse = false,
    platNm= 'binance'
}: {
    parse?: boolean;
    platNm?: 'binance' | 'okx' | 'bybit';
}) => {
    const bin = new TestBinance();
    for (let year of years) {
        for (let symb of symbols) {
            for (let interval of intervals) {
                console.log(`\nDownloading ${symb}, ${year}, ${interval}m\n`);

                const msymb = symb.split("/");

                symb = platNm == 'okx' ? msymb.join("-") : msymb.join("");
                const fname = `${symb}_${interval}m.json`;
                const klinesPath =`${klinesRootDir}/${platNm}/${year}/${fname}`;
                const dfsPath = `${dfsRootDir}/${platNm}/${year}/${fname}`;
                ensureDirExists(klinesPath);
                const bot = new Bot({
                    name: "TBOT",
                    base: msymb[0],
                    ccy: msymb[1],
                    interval,
                });
                const plat = platNm =='okx' ? new TestOKX() : platNm == 'bybit' ? new TestBybit() : new TestBinance();
                const month = platNm == 'okx' ? (year < 2022 ? '07' : '01') : '01'
                let klines = await plat.getKlines({
                    symbol: symb,
                    start: Date.parse(`${year}-${month}-01 00:00:00 GMT+2`),
                    end: Date.parse(`${year}-12-31 23:59:00 GMT+2`),
                    interval,
                    savePath: klinesPath,
                });
                if (parse && klines) {
                    const df = chandelierExit(heikinAshi(parseKlines(klines), [bot.base, bot.ccy]));
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

const klinesToDf = async (fp: string, saveFp: string)=>{
    if (!existsSync(fp)) {
        console.log("KLINES DO NOT EXISTS");
        return;
    }
    const klines = readJson(fp);
    const df = chandelierExit(heikinAshi(parseKlines(klines), []));
    ensureDirExists(saveFp);
    writeFileSync(saveFp, JSON.stringify(df));
    console.log("DONE WRITING DF");
}

function afterKlines() {
    for (let year of years) {
        for (let interval of intervals) {
            for (let symb of symbols) {
                createDf(year, interval, symb);
            }
        }
    }
}

dld({platNm: 'binance'}) 
//createDf(2024,15,"SOLUSDT")
//afterKlines()


async function test() {
    /* const klines = await bin.getKlines("SOLUSDT", undefined, Date.parse("2024-06-04 14:47:00 GMT+2"))
    console.log(chandelierExit(heikinAshi(parseKlines(klines!)))[klines!.length - 1]) */
}
//downloader({symbol: 'SOL/USDT', start: '2024-06-15 00:00:00 GMT+2', end: '2024-06-20 23:59:00 GMT+2', interval: 15})

const fp = "src/data/klines/binance/SOL-USDT_15m_2024-05-01 00 00 00 GMT+2_2024-06-11 23 59 00 GMT+2.json"
const saveFp = "src/data/dfs/binance/SOL-USDT_15m_2024-05-01 00 00 00 GMT+2_2024-06-11 23 59 00 GMT+2.json"
//klinesToDf(fp, saveFp)