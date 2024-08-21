import { Server } from "socket.io";
import { CorsOptions } from "cors";
import { IObj } from "./interfaces";
import {
    tuCE,
    heikinAshi,
    parseDate,
    parseKlines,
    tuPath,
} from "./funcs2";
import {
    klinesDir,
    klinesRootDir,
    tradesRootDir,
} from "./constants";
import { existsSync } from "fs";
import { clearTerminal, getPricePrecision, getSymbol, readJson, toFixed } from "./functions";
import { objStrategies, parentStrategies, strategies } from "@/strategies";
import { TestOKX } from "@/classes/test-platforms";
import { platforms } from "./consts";
import {onBacktest, onCointest} from './functions/io-funcs'

const corsOptions: CorsOptions = { origin: "*" };
const io = new Server({ cors: corsOptions }); // yes, no server arg here; it's not required
let prevData: any = null;
// attach stuff to io
io.on("connection", (client) => {
    console.log(`IO: ${client.id} CONNECTED`);
    
    console.log({ep: prevData?.ep})
    if (prevData && prevData.ep) {
        
        io.emit(prevData.ep, prevData.data);
        //prevData = null
    }
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

    client.on("backtest", async (d)=>prevData = await onBacktest(d, client));
    client.on("cointest", async (d)=>prevData = await onCointest(d, client));

    client.on("strategies", (e) => {
        client.emit("strategies", { data: strategies });
    });
    client.on("platforms", (e) => {
        client.emit("platforms", { data: Object.keys(platforms) });
    });
    client.on("parents", (e) => {
        client.emit("parents", { data: Object.keys(parentStrategies) });
    });

    client.on("test-candles", async (data: IObj) => {
        clearTerminal()
        try {
            const pair = data.symbol;
            let {
                interval,
                start,
                end,
                offline,
                platform,
                isHa,
                useFile,
                file,
                save,
                isParsed,demo
            } = data;

            const startTs = Date.parse(start),
                endTs = Date.parse(end);

            let klinesPath: string | null;
            let klines: any[] = [];

            client.emit("test-candles", "Getting klines...");

            const plat =new platforms[platform]({demo});
            const platName = platform.toLowerCase();
            const symbol = getSymbol(pair, platName)
            console.log(symbol);
            const test = false;
            if (useFile && !file) {
                client.emit("test-candles", { err: "File required" });
                return;
            }
            start = start ?? parseDate(new Date());
                const year = start.split("-")[0];
                const sub = demo ? "demo" : "live";
            klinesPath = tuPath(
                    `${klinesRootDir}/${platName.toLowerCase()}/${year}/${sub}/${symbol}_${interval}m-${sub}.json`
            );

            if (offline && !useFile) {
                console.log("IS OFFLINE");
                
                
                if (!existsSync(klinesPath!)) {
                    const err = {
                        err: `${klinesPath} does not exist`,
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
                    savePath: save ? klinesPath : undefined
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

            let df = tuCE(heikinAshi(klines));
            if (offline && !useFile) {
                // Return oly df from startTs to endTs
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
                    std: {
                        o: el.o,
                        h: el.h,
                        l: el.l,
                        c: el.c,
                        sma_20: el.sma_20,
                        sma_50: el.sma_50, vol: el.v
                    },
                    ha: { o: el.ha_o, h: el.ha_h, l: el.ha_l, c: el.ha_c, vol: el.v },
                };
            });
            client.emit("test-candles", {
                data: retData,
                symbol: pair,
                interval,
            });
            return retData;
        } catch (e: any) {
            console.log(e.response?.data ?? e);
            client.emit("test-candles", { err: "Something went wrong" });
        }
    });
});

export default io;