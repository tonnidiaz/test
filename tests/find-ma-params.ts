
import {
    klinesRootDir,
    MAKER_FEE_RATE,
    TAKER_FEE_RATE,
} from "@/utils/constants";
import { heikinAshi, parseKlines, tuCE, tuMacd } from "@/utils/funcs2";
import {
    clearTerminal,
    existsSync,
    getSymbol,
    readJson,
    sleep,
    toFixed,
    writeJson,
} from "@/utils/functions";
import { ICandle, TPlatName } from "@/utils/interfaces";
clearTerminal();

console.log(`\nPID: ${process.pid}\n`);
async function run() {
    const { MA_ONLY, MACD_ONLY } = require("@/strategies/macd");
    const data = {
        subPath: "live",
        platName: "okx",
        pair: ["SOL", "USDT"],
        interval: 60,
        bal: 50,
        start: "2024-01-01 00:00:00+02:00",
        end: "2024-10-28 23:59:00+02:00",
    };
    const { interval, subPath, pair, platName, bal, start, end } = data;
    let symbol = getSymbol(data.pair, data.platName as TPlatName);
    const year = start.split("-")[0];
    const startTs = Date.parse(start),
        endTs = Date.parse(end);

    const pth = `${klinesRootDir}/${platName.toLowerCase()}/${year}/${subPath}/${symbol}_${interval}m-${subPath}.json`;
    const savePath = `_data/rf/ma-params/${year}/${platName}/MA/${symbol}_${interval}.json`;
    const ret: {
        fast: number;
        slow: number;
        profit: number;
        trades: number;
    }[] = [];
    let klines = await readJson(pth);
    klines = klines.filter(
        (el) => startTs <= Number(el[0]) && Number(el[0]) <= endTs
    );
    const str = new MA_ONLY();
    let df = heikinAshi(parseKlines(klines ?? []));
    for (let slow = 2; slow < 90; slow++) {
        await sleep(0.00001);
        console.log(`BEGIN SLOW [${slow}]...\n`);
        for (let fast = 1; fast < slow; fast++) {
            await sleep(0.00001);
            df = tuCE(df, fast, slow);
            let retData = await str.run({
                df,
                trades: [],
                balance: bal,
                pair: pair,
                maker: MAKER_FEE_RATE,
                taker: TAKER_FEE_RATE,
                platNm: platName.toLowerCase() as any,
                parent: "legacy",
            });

            let profit = toFixed(retData.balance - bal, 2);
            console.log({
                balance: retData.balance,
                aside: retData.aside,
                profit,
            });
            ret.push({ fast, slow, profit, trades: retData.trades });

            writeJson(
                savePath,
                ret.sort((a, b) => b.profit - a.profit)
            );
        }
        console.log(`SLOW [${slow}] DONE!!\n`);
    }
}

async function runMACD() {
    const { MA_ONLY, MACD_ONLY } = require("@/strategies/macd");
    const data = {
        subPath: "live",
        platName: "okx",
        pair: ["SOL", "USDT"],
        interval: 60,
        bal: 50,
        start: "2024-01-01 00:00:00+02:00",
        end: "2024-10-28 23:59:00+02:00",
    };
    const { interval, subPath, pair, platName, bal, start, end } = data;
    let symbol = getSymbol(data.pair, data.platName as TPlatName);
    const year = start.split("-")[0];
    const startTs = Date.parse(start),
        endTs = Date.parse(end);

    const pth = `${klinesRootDir}/${platName.toLowerCase()}/${year}/${subPath}/${symbol}_${interval}m-${subPath}.json`;
    const savePath = `_data/rf/ma-params/${year}/${platName}/MACD/${symbol}_${interval}.json`;
    const ret: {
        fast: number;
        slow: number;
        signal: number;
        profit: number;
        trades: number;
    }[] = [];
    let klines = await readJson(pth);
    klines = klines.filter(
        (el) => startTs <= Number(el[0]) && Number(el[0]) <= endTs
    );
    const str = new MACD_ONLY();
    let df: ICandle[] = heikinAshi(parseKlines(klines ?? []));
    let _slowStart = 2, _fastStart = 1, _signalStart = 2
    const MAX = 95
    if (existsSync(savePath)){
        const oldData =await readJson(savePath)
        ret.push(...oldData)
        _slowStart = Math.max(...ret.map(el=> el.slow))
        _fastStart = Math.max(...ret.map(el=> el.fast))
        _signalStart = Math.max(...ret.map(el=> el.signal))
        console.log({_slowStart, _signalStart, _fastStart})
        
    }
    for (let slow = _slowStart; slow < MAX; slow++) {
        await sleep(0.00001);
        console.log(`BEGIN SLOW [${slow}]...\n`);
        for (let signal = _signalStart; signal < MAX; signal++) {
            for (let fast = _fastStart; fast < slow; fast++) {
                await sleep(0.00001);
                const macd = tuMacd(df, slow, fast, signal);
                const { histogram, macdLine, signalLine } = macd;
                for (let i = 0; i < df.length; i++) {
                    df[i].hist = histogram[i];
                    df[i].macd = macdLine[i];
                    df[i].signal = signalLine[i];
                }
                let retData = await str.run({
                    df,
                    trades: [],
                    balance: bal,
                    pair: pair,
                    maker: MAKER_FEE_RATE,
                    taker: TAKER_FEE_RATE,
                    platNm: platName.toLowerCase() as any,
                    parent: "legacy",
                });

                let profit = toFixed(retData.balance - bal, 2);
                console.log({
                    balance: retData.balance,
                    aside: retData.aside,
                    profit,
                });
                ret.push({ fast, slow, signal, profit, trades: retData.trades });

                writeJson(
                    savePath,
                    ret.sort((a, b) => b.profit - a.profit)
                );
            }
        }

        console.log(`SLOW [${slow}] DONE!!\n`);
    }
}

runMACD()