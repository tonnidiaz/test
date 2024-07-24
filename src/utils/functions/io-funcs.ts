
import { Server, Socket } from "socket.io";
import { IObj } from "../interfaces";
import {
    tuCE,
    heikinAshi,
    parseDate,
    parseKlines,
    tuPath,
} from "../funcs2";
import {
    klinesDir,
    klinesRootDir,
    tradesRootDir,
} from "../constants";
import { existsSync } from "fs";
import { getPricePrecision, readJson, toFixed } from "../functions";
import { objStrategies, strategies } from "@/strategies";
import { TestOKX } from "@/classes/test-platforms";
import { platforms } from "../consts";
let prevData: IObj | null = null;

export const onBacktest = async (data: IObj, client?: Socket, io?:Server) => {
    try {
        const baseCcy = data.symbol;
        let {
            interval,
            start,
            end,
            offline,
            platform,
            isHa,
            useFile,
            file,
            isParsed,
            clId,
            T
        } = data;
        console.log("ON BACKTEST");
        prevData = null;
        const startTs = Date.parse(start),
            endTs = Date.parse(end);

        let klinesPath: string | null;
        let klines: any[] = [];
        let trades: any[] = [];

        client?.emit("backtest", "Getting klines...");

        const plat = platforms[platform].obj;
        const platName = platforms[platform].name;
        let symbol: string =
            plat instanceof TestOKX ? baseCcy.join("-") : baseCcy.join("");
        console.log(symbol);
        const test = false;
        if (useFile && !file) {
            client?.emit("backtest", { err: "File required" });
            return;
        }
        if (offline && !useFile) {
            console.log("IS OFFLINE");
            start = start ?? parseDate(new Date());
            const year = start.split("-")[0];
            const pth =
                "src/data/klines/binance/SOL-USDT_5m_2023-01-01 00 00 00+02:00_2023-10-31 23 59 00+02:00.json";
            klinesPath = test
                ? tuPath(pth)
                : tuPath(
                      `${klinesRootDir}/${platName.toLowerCase()}/${year}/${symbol}_${interval}m.json`
                  );
            const tradesPath = tuPath(
                `${tradesRootDir}/${platName.toLocaleLowerCase()}/${year}/trades.json`
            );

            if (!existsSync(klinesPath!)) {
                const err = {
                    err: `DataFrame for ${symbol} in ${year} at ${interval}m does not exist`,
                };
                client?.emit("backtest", err);
                return;
            }
            if (T){
              if (existsSync(tradesPath)) {
                trades = await require(tradesPath);
                console.log({
                    trades: [trades[0], trades[trades.length - 1]],
                });
            }  
            }
            
        } else if (!offline && !useFile) {
            //const bot = new Bot({name:"Temp", base: baseCcy[0], ccy: baseCcy[1]})
            //const bybit = new Bybit(bot)
            const r = await plat.getKlines({
                start: startTs,
                end: endTs,
                interval,
                symbol,
            });
            if (!r) {
                client?.emit("err", "Failed to get klines");
                return;
            }
            const r2 = !T
                ? []
                : await plat.getTrades({
                      start: startTs,
                      end: endTs,
                      symbol,
                  });
            if (!r2) {
                client?.emit("err", "Failed to get trades");
                return;
            }
            trades = r2;
            klines = r;
        }
        if (offline && !useFile)
            console.log(`\nKLINES_PATH: ${klinesPath!}\n`);
        if (useFile) console.log(`\nUse file\n`);
        console.log({ start, end });
        klines =
            useFile && file
                ? JSON.parse(file.toString("utf-8"))
                : offline
                ? await require(klinesPath!)
                : klines;
        console.log({ startTs, m: Number(klines[0][0]), endTs });
        console.log({
            startTs: new Date(startTs),
            m: Number(klines[0][0]),
            endTs: new Date(endTs),
        });
        if (offline){
             klines = klines.filter(
            (el) => startTs <= Number(el[0]) && Number(el[0]) <= endTs
        );
        }
       
        client?.emit("backtest", "Analyzing data...");
        klines = isParsed && useFile ? klines : parseKlines(klines);
        let df = tuCE(
            isHa && useFile ? klines : heikinAshi(klines)
        );


        if (!useFile) {
            // Return oly df from startTs to endTs
            df = df.filter(
                      (el) =>
                          Date.parse(el.ts) <= endTs &&
                          Date.parse(el.ts) >= startTs
                  );
        }
        let bal = Number(data.bal);

        client?.emit("backtest", "Backtesting....");

        const lev = data.lev ? Number(data.lev) : 1;
        const strNum = Number(data.strategy);

        const pGain = data.pGain ? Number(data.pGain) : undefined;
        let retData = objStrategies[strNum - 1].run({
            df,
            trades,
            balance: bal,
            lev,
            pair: baseCcy,
            pGain,
            maker: plat.maker,
            taker: plat.taker,
            platNm: platName.toLowerCase() as any
        });
        retData.profit = toFixed(
            retData.balance - bal,
            getPricePrecision(baseCcy, platName as any)
        );
        retData = { ...retData, base: baseCcy[0], ccy: baseCcy[1] };

        console.log(`TRADES: ${retData.trades}`);
        console.log(`PROFIT: ${retData.profit}\n`);
        const str_name = objStrategies[strNum - 1].name
        console.log({str_name});

        
        retData = { data: {...retData,str_name }, clId };
        prevData = retData;
        client?.emit("backtest", retData);
        return retData;
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit("backtest", { err: "Something went wrong" });
    }
}