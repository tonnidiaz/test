"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const funcs2_1 = require("./funcs2");
const constants_1 = require("./constants");
const fs_1 = require("fs");
const functions_1 = require("./functions");
const strategies_1 = require("@/strategies");
const consts_1 = require("./consts");
const io_funcs_1 = require("./functions/io-funcs");
const corsOptions = { origin: "*" };
const io = new socket_io_1.Server({ cors: corsOptions }); // yes, no server arg here; it's not required
let prevData = null;
// attach stuff to io
io.on("connection", (client) => {
    console.log(`IO: ${client.id} CONNECTED`);
    console.log({ ep: prevData?.ep });
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
    client.on("backtest", async (d) => prevData = await (0, io_funcs_1.onBacktest)(d, client));
    client.on("cointest", async (d) => prevData = await (0, io_funcs_1.onCointest)(d, client));
    client.on("strategies", (e) => {
        client.emit("strategies", { data: strategies_1.strategies });
    });
    client.on("platforms", (e) => {
        client.emit("platforms", { data: Object.keys(consts_1.platforms) });
    });
    client.on("parents", (e) => {
        client.emit("parents", { data: Object.keys(strategies_1.parentStrategies) });
    });
    client.on("test-candles", async (data) => {
        (0, functions_1.clearTerminal)();
        try {
            const pair = data.symbol;
            let { interval, start, end, offline, platform, isHa, useFile, file, save, isParsed, demo } = data;
            const startTs = Date.parse(start), endTs = Date.parse(end);
            let klinesPath;
            let klines = [];
            client.emit("test-candles", "Getting klines...");
            const plat = new consts_1.platforms[platform]({ demo });
            const platName = platform.toLowerCase();
            const symbol = (0, functions_1.getSymbol)(pair, platName);
            console.log(symbol);
            const test = false;
            if (useFile && !file) {
                client.emit("test-candles", { err: "File required" });
                return;
            }
            start = start ?? (0, funcs2_1.parseDate)(new Date());
            const year = start.split("-")[0];
            const sub = demo ? "demo" : "live";
            klinesPath = (0, funcs2_1.tuPath)(`${constants_1.klinesRootDir}/${platName.toLowerCase()}/${year}/${sub}/${symbol}_${interval}m-${sub}.json`);
            if (offline && !useFile) {
                console.log("IS OFFLINE");
                if (!(0, fs_1.existsSync)(klinesPath)) {
                    const err = {
                        err: `${klinesPath} does not exist`,
                    };
                    client.emit("test-candles", err);
                    return;
                }
            }
            else if (!offline && !useFile) {
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
                console.log(`\nKLINES_PATH: ${klinesPath}\n`);
            if (useFile)
                console.log(`\nUse file\n`);
            client.emit("test-candles", "Analyzing data...");
            klines =
                useFile && file
                    ? JSON.parse(file.toString("utf-8"))
                    : offline
                        ? (0, functions_1.readJson)(klinesPath)
                        : klines;
            klines = (0, funcs2_1.parseKlines)(klines);
            let df = (0, funcs2_1.tuCE)((0, funcs2_1.heikinAshi)(klines));
            if (offline && !useFile) {
                // Return oly df from startTs to endTs
                df = test
                    ? df
                    : df.filter((el) => Date.parse(el.ts) <= endTs &&
                        Date.parse(el.ts) >= startTs);
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
        }
        catch (e) {
            console.log(e.response?.data ?? e);
            client.emit("test-candles", { err: "Something went wrong" });
        }
    });
});
exports.default = io;
//# sourceMappingURL=io.js.map