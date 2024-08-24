"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestBybit = exports.TestOKX = exports.Platform = void 0;
const constants_1 = require("@/utils/constants");
const funcs_1 = require("@/utils/orders/funcs");
const funcs2_1 = require("@/utils/funcs2");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const bybit_api_1 = require("bybit-api");
const okx_api_1 = require("okx-api");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class Platform {
    name = "";
    maker = constants_1.MAKER_FEE_RATE;
    taker = constants_1.TAKER_FEE_RATE;
    demo;
    constructor({ demo = false }) {
        this.demo = demo;
    }
    async getKlines({ start, end, savePath, interval, symbol, }) {
        return;
    }
    async getTrades({ start, end, savePath, symbol, }) {
        console.log(`\nGETTING TRADES FOR ${symbol}...\n`);
        if (savePath) {
            (0, funcs_1.ensureDirExists)(savePath);
        }
        return;
    }
}
exports.Platform = Platform;
class TestOKX extends Platform {
    name = "OKX";
    maker = 0.08 / 100;
    taker = 0.1 / 100;
    client;
    flag;
    apiKey;
    apiSecret;
    passphrase;
    constructor({ demo = false }) {
        super({ demo });
        this.flag = demo ? "1" : "0";
        this.apiKey = demo
            ? process.env.OKX_API_KEY_DEV
            : process.env.OKX_API_KEY;
        this.apiSecret = demo
            ? process.env.OKX_API_SECRET_DEV
            : process.env.OKX_API_SECRET;
        this.passphrase = process.env.OKX_PASSPHRASE;
        this.client = new okx_api_1.RestClient({
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
            apiPass: this.passphrase,
        }, demo ? "demo" : "prod");
    }
    async getKlines({ start, end, savePath, interval, symbol, isBybit, }) {
        const bybit_apiKey = this.demo
            ? process.env.BYBIT_API_KEY_DEV
            : process.env.BYBIT_API_KEY;
        const bybit_apiSecret = this.demo
            ? process.env.BYBIT_API_SECRET_DEV
            : process.env.BYBIT_API_SECRET;
        const bybit_passphrase = process.env.BYBIT_PASSPHRASE;
        const client = new bybit_api_1.RestClientV5({
            demoTrading: this.demo,
            testnet: this.demo,
            key: bybit_apiKey, secret: bybit_apiSecret
        });
        console.log({ client: "client", demo: this.demo }, "\n");
        end = end ?? Date.now();
        let klines = [];
        let cnt = 0;
        console.log(`[ ${isBybit ? "ByBit" : this.name} ] \t GETTING KLINES.. FOR ` + symbol);
        if (start) {
            start =
                (isBybit ? start : start) /* - interval * 60 * 1000 */ -
                    20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
        }
        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                const limit = isBybit ? 1000 : 100;
                console.log(`GETTING ${cnt + 1} KLINES LIMIT: ${limit}`);
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(`Before: ${(0, funcs2_1.parseDate)(new Date(firstTs))} \t After: ${(0, funcs2_1.parseDate)(new Date(after))}`);
                console.log("GETTING MARK PRICE");
                const res = isBybit
                    ? await client.getKline({
                        category: "spot",
                        symbol,
                        interval: interval,
                        start: firstTs + interval * 60 * 1000,
                        limit
                    })
                    : await this.client.getHistoricCandles(symbol, (0, funcs2_1.getInterval)(interval, "okx"), {
                        before: `${firstTs}`,
                        after: `${after}`,
                        limit: `${limit}`,
                    });
                const data = isBybit
                    ? res.result.list
                    : res;
                if (!data?.length)
                    break;
                klines.push(...[...data].reverse());
                firstTs = Number(data[0][0]);
                console.log({
                    last_kline: (0, funcs2_1.parseDate)(new Date(Number(klines[klines.length - 1][0]))),
                    first_ts: (0, funcs2_1.parseDate)(new Date(firstTs))
                });
                if (savePath) {
                    (0, funcs_1.ensureDirExists)(savePath);
                    (0, fs_1.writeFileSync)(savePath, JSON.stringify(klines));
                    console.log("Saved");
                }
                //if (cnt > 0) break
                cnt += 1;
            }
        }
        else {
            const res = await (isBybit
                ? client.getKline({
                    category: "spot",
                    symbol,
                    interval: interval,
                    start,
                    end,
                })
                : this.client.getHistoricCandles(symbol, (0, funcs2_1.getInterval)(interval, "okx"), {
                    before: start ? `${start}` : undefined,
                    after: end ? `${end}` : undefined,
                }));
            const data = isBybit
                ? res.result.list
                : res;
            klines = [...data].reverse();
        }
        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }
    async getTrades({ start, end, savePath, symbol, isBybit, }) {
        try {
            end = end ?? Date.now();
            let trades = [];
            let cnt = 0;
            const interval = 1 / 100;
            console.log(`[ ${isBybit ? "ByBit" : this.name} ] \t GETTING TRADES.. FOR ` + symbol);
            if (start) {
                let endTs = end;
                console.log(endTs, end);
                while (endTs > start) {
                    console.log(`GETTING ${cnt + 1} TRADES...`);
                    const limit = 100;
                    //const after = firstTs + (limit - 1) * interval * 60 * 1000;
                    console.log(`Before: ${(0, funcs2_1.parseDate)(new Date(start))} \t After: ${(0, funcs2_1.parseDate)(new Date(endTs))}`);
                    const res = await this.client.getHistoricTrades(symbol, {
                        //before: `${firstTs}`,
                        after: `${endTs}`,
                        limit: `${limit}`,
                        type: "2",
                    });
                    const data = isBybit
                        ? res.result.list
                        : res;
                    console.log(data);
                    if (!data.length)
                        break;
                    trades = [...trades, ...data];
                    endTs = Number(data[data.length - 1].ts);
                    console.log("END_TS:");
                    console.log(new Date(endTs).toISOString());
                    if (savePath) {
                        (0, funcs_1.ensureDirExists)(savePath);
                        (0, fs_1.writeFileSync)(savePath, JSON.stringify(trades));
                        console.log("Saved");
                    }
                    console.log(`DONE ${cnt}`);
                    cnt += 1;
                }
            }
            console.log("\nDONE GETTING ALL TRADES\n");
            let d = [...trades.reverse()];
            if (trades.length)
                console.log({
                    trades: {
                        ...trades[0],
                        ts: (0, funcs2_1.parseDate)(new Date(Number(trades[0].ts))),
                    },
                });
            return d.sort((a, b) => Number(a.ts) - Number(b.ts));
        }
        catch (e) {
            console.log(e);
        }
    }
}
exports.TestOKX = TestOKX;
class TestBybit extends Platform {
    client;
    constructor({ demo = false }) {
        super({ demo });
        const apiKey = demo
            ? process.env.BYBIT_API_KEY_DEV
            : process.env.BYBIT_API_KEY;
        const apiSecret = demo
            ? process.env.BYBIT_API_SECRET_DEV
            : process.env.BYBIT_API_SECRET;
        this.client = new bybit_api_1.RestClientV5({
            key: apiKey,
            secret: apiSecret,
            demoTrading: demo,
            //testnet: demo,
        });
    }
    name = "ByBit";
    async getKlines({ start, end, savePath, interval, symbol, }) {
        return await TestOKX.prototype.getKlines({
            start,
            end,
            savePath,
            interval,
            symbol,
            isBybit: true,
        });
    }
    createSignature(apiKey, apiSecret, params) {
        const paramString = Object.keys(params)
            .sort()
            .map((key) => `${key}=${params[key]}`)
            .join("&");
        const timestamp = Date.now().toString();
        const prehashString = `${timestamp}${apiKey}${paramString}`;
        const signature = crypto_1.default
            .createHmac("sha256", apiSecret)
            .update(prehashString)
            .digest("hex");
        const headers = {
            "X-BYBIT-API-KEY": apiKey,
            "X-BYBIT-SIGNATURE": signature,
            "X-BYBIT-TIMESTAMP": timestamp,
            "Content-Type": "application/json",
        };
        return headers;
    }
    async getTrades({ start, end, savePath, symbol, }) {
        try {
            end = end ?? Date.now();
            let trades = [];
            let cnt = 0;
            const interval = 1 / 100;
            console.log(`[ ${this.name} ] \t GETTING TRADES.. FOR ` + symbol);
            console.log(symbol);
            if (start) {
                let endTs = end;
                console.log(endTs, start);
                while (endTs > start) {
                    console.log(`GETTING ${cnt + 1} TRADES...`);
                    const limit = 100;
                    //const after = firstTs + (limit - 1) * interval * 60 * 1000;
                    console.log(`START: ${(0, funcs2_1.parseDate)(new Date(start))} \t END: ${(0, funcs2_1.parseDate)(new Date(endTs))}`);
                    const res = await this.client.getPublicTradingHistory({
                        category: "spot",
                        symbol,
                        limit: 10,
                    });
                    if (res.retCode == 0) {
                        console.log(res.result.list);
                    }
                    else {
                        console.log(res);
                    }
                    const data = res.result.list;
                    if (!data.length)
                        break;
                    trades = [
                        ...trades,
                        ...data.map((el) => ({
                            ts: el.time,
                            px: Number(el.price),
                            sz: Number(el.price),
                            side: el.side,
                            symbol: el.symbol,
                        })),
                    ];
                    endTs = Number(data[data.length - 1].time);
                    console.log("START_TS:");
                    console.log(new Date(endTs).toISOString());
                    if (savePath) {
                        (0, funcs_1.ensureDirExists)(savePath);
                        (0, fs_1.writeFileSync)(savePath, JSON.stringify(trades));
                        console.log("Saved");
                    }
                    console.log(`DONE ${cnt}`);
                    cnt += 1;
                }
            }
            console.log("\nDONE GETTING ALL TRADES\n");
            let d = [...trades.reverse()];
            if (trades.length)
                console.log({
                    trades: {
                        ...trades[0],
                        ts: (0, funcs2_1.parseDate)(new Date(Number(trades[0].ts))),
                    },
                });
            return d.sort((a, b) => Number(a.ts) - Number(b.ts));
        }
        catch (e) {
            console.log(e);
        }
    }
    async getOBData() {
        //const res = await this.client.getOrderbook({symbol: 'ETHUSDT',})
    }
}
exports.TestBybit = TestBybit;
//# sourceMappingURL=test-platforms.js.map