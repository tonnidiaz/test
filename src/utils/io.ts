import { Server } from "socket.io";
import { CorsOptions } from "cors";
import { IObj } from "./interfaces";
import {
    chandelierExit,
    heikinAshi,
    parseDate,
    parseKlines,
    tuPath,
} from "./funcs2";
import { klinesDir, klinesRootDir } from "./constants";
import { existsSync } from "fs";
import { getPricePrecision, readJson, toFixed } from "./functions";
import { objStrategies, strategies } from "@/strategies";
import { TestOKX } from "@/classes/test-platforms";
import { platforms } from "./consts";

const corsOptions: CorsOptions = { origin: "*" };
const io = new Server({ cors: corsOptions }); // yes, no server arg here; it's not required
// attach stuff to io
io.on("connection", (client) => {
    console.log(`${client.id} CONNECTED`);

    io.emit("event", "This is event");
    client.on("event", (d) => {
        console.log(d);
    });
    client.on("comment", (data) => {
        console.log("RETURNING THE COMMENT..");

        io.emit("comment", data);
    });
    client.on("rf", (d) => {
        console.log("RF:", d);
        setTimeout(() => {
            console.log("RETURNING THE FAVOUR..");
            io.emit("rf", "I got you dawg");
        }, 1500);
    });

    client.on("backtest", async (data: IObj) => {
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
            } = data;
console.log('ON BACKTEST');
            const startTs = Date.parse(start),
                endTs = Date.parse(end);

            let klinesPath: string | null;
            let klines: any[] = [];

            client.emit("backtest", "Getting klines...");

            const plat = platforms[platform].obj;
            const platName = platforms[platform].name
            let symbol: string =
                plat instanceof TestOKX ? baseCcy.join("-") : baseCcy.join("");
            console.log(symbol);
            const test = false;
            if (useFile && !file) {
                client.emit("backtest", { err: "File required" });
                return;
            }
            if (offline && !useFile) {
                console.log("IS OFFLINE");
                start = start ?? parseDate(new Date());
                const year = start.split("-")[0];
                const pth =
                    "src/data/klines/binance/SOL-USDT_5m_2023-01-01 00 00 00 GMT+2_2023-10-31 23 59 00 GMT+2.json";
                klinesPath = test
                    ? tuPath(pth)
                    : tuPath(
                          `${klinesRootDir}/${platName.toLowerCase()}/${year}/${symbol}_${interval}m.json`
                      );

                if (!existsSync(klinesPath!)) {
                    const err = {
                        err: `DataFrame for ${symbol} in ${year} at ${interval}m does not exist`,
                    };
                    client.emit("backtest", err);
                    return;
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
                    client.emit("err", "Failed to get klines");
                    return;
                }
                klines = r;
            }
            if (offline && !useFile)
                console.log(`\nKLINES_PATH: ${klinesPath!}\n`);
            if (useFile) console.log(`\nUse file\n`);
            client.emit("backtest", "Analyzing data...");
            klines =
                useFile && file
                    ? JSON.parse(file.toString("utf-8"))
                    : offline
                    ? readJson(klinesPath!)
                    : klines;
            klines = isParsed && useFile ? klines : parseKlines(klines);
            let df = chandelierExit(
                isHa && useFile ? klines : heikinAshi(klines, baseCcy)
            );
            if (offline && !useFile) {
                // Return oly df from startTs to endTs
                console.log(df[0]);
                df = test
                    ? df
                    : df.filter(
                          (el) =>
                              Date.parse(el.ts) <= endTs &&
                              Date.parse(el.ts) >= startTs
                      );
            }
            let bal = Number(data.bal);

            client.emit("backtest", "Backtesting....");

            const lev = data.lev ? Number(data.lev) : 1;
            const strNum = Number(data.strategy);

            const pGain = data.pGain ? Number(data.pGain) : undefined;
            let retData = objStrategies[strNum - 1].run({
                df,
                balance: bal,
                lev,
                pair: baseCcy, 
                pGain,
                maker: plat.maker,
                taker: plat.taker,
            });
            retData.profit = toFixed(
                retData.balance - bal,
                getPricePrecision(baseCcy, platName as any)
            );
            retData = { ...retData, base: baseCcy[0], ccy: baseCcy[1] };
            const orders = retData.data;
            for (let ts of Object.keys(orders)) {
                retData.data[ts]["ts"] = parseDate(
                    new Date(Date.parse(ts) + interval * 0 * 1000)
                );
                // retData.data[ts]['enterTs'] = parseDate(new Date(Date.parse(retData.data[ts]['enterTs'] ) + interval * 60 * 1000))
            }
            console.log(`PROFIT: ${retData.profit}`);
            client.emit("backtest", { data: retData });
            return retData;
        } catch (e: any) {
            console.log(e.response?.data ?? e);
            client.emit("backtest", { err: "Something went wrong" });
        }
    });

    client.on("strategies", (e) => {
        client.emit("strategies", { data: strategies });
    });
    client.on("platforms", (e) => {
        client.emit("platforms", { data: platforms.map((el) => el.name) });
    });

    client.on("test-candles", async (data: IObj) => {
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
            } = data;

            const startTs = Date.parse(start),
                endTs = Date.parse(end);

            let klinesPath: string | null;
            let klines: any[] = [];

            client.emit("test-candles", "Getting klines...");

            const plat = platforms[platform].obj;
            const platName = platforms[platform].name
            let symbol: string =
                plat instanceof TestOKX ? baseCcy.join("-") : baseCcy.join("");
            console.log(symbol);
            const test = false;
            if (useFile && !file) {
                client.emit("test-candles", { err: "File required" });
                return;
            }
            if (offline && !useFile) {
                console.log("IS OFFLINE");
                start = start ?? parseDate(new Date());
                const year = start.split("-")[0];
                klinesPath = tuPath(
                    `${klinesRootDir}/${platName.toLowerCase()}/${year}/${symbol}_${interval}m.json`
                );

                if (!existsSync(klinesPath!)) {
                    const err = {
                        err: `DataFrame for ${symbol} in ${year} at ${interval}m does not exist`,
                    };
                    client.emit("test-candles", err);
                    return;
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
                    client.emit("err", "Failed to get klines");
                    return;
                }
                klines = r;
            }
            if (offline && !useFile)
                console.log(`\nKLINES_PATH: ${klinesPath!}\n`);
            if (useFile) console.log(`\nUse file\n`);

            client.emit("test-candles", "Analyzing data...");
            klines =
                useFile && file
                    ? JSON.parse(file.toString("utf-8"))
                    : offline
                    ? readJson(klinesPath!)
                    : klines;
            klines = parseKlines(klines);

            let df =chandelierExit(heikinAshi(klines, baseCcy));
            if (offline && !useFile) {
                // Return oly df from startTs to endTs
                console.log(df[0]);
                df = test
                    ? df
                    : df.filter(
                          (el) =>
                              Date.parse(el.ts) <= endTs &&
                              Date.parse(el.ts) >= startTs
                      );
            }
            const retData = df.map((el, i) => {
                const ts = el.ts;
                return {
                    ts: ts,
                    sma_20: el.sma_20,
                    sma_50: el.sma_50,
                    std: { o: el.o, h: el.h, l: el.l, c: el.c },
                    ha: { o: el.ha_o, h: el.ha_h, l: el.ha_l, c: el.ha_c },
                };
            });
            client.emit("test-candles", { data: retData, symbol: baseCcy, interval });
            return retData;
        } catch (e: any) {
            console.log(e.response?.data ?? e);
            client.emit("test-candles", { err: "Something went wrong" });
        }
    });
});

export default io;
