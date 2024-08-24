"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestBinance = void 0;
const data_1 = require("@/data/data");
const funcs_1 = require("@/utils/orders/funcs");
const funcs2_1 = require("@/utils/funcs2");
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const test_platforms_1 = require("./test-platforms");
const ccxt_1 = require("ccxt");
class TestBinance extends test_platforms_1.Platform {
    client;
    constructor({ demo = false }) {
        super({ demo });
        this.client = new ccxt_1.binance();
    }
    async getKlines({ symbol, start, end, interval = 15, savePath, }) {
        try {
            if (savePath) {
                console.log("DELETING PREVIOUS DATA...");
                try {
                    (0, fs_1.unlinkSync)(savePath);
                }
                catch (e) {
                    console.log("ERROR REMOVING FILE");
                }
            }
            let cnt = 0;
            let klines = [];
            symbol = (symbol ?? data_1.data.symbol).replaceAll("-", "");
            interval = interval ?? data_1.data.interval;
            ///if (start) start -= 10 * interval * 60 * 1000;
            end = end ?? Date.now();
            const parsedInterval = interval < 60
                ? `${interval}m`
                : `${Math.round(interval / 60)}h`;
            if (start) {
                let firstTs = start;
                while (firstTs <= end) {
                    console.log(`[Binance] GETTING ${cnt + 1} KLINES...`);
                    console.log((0, funcs2_1.parseDate)(new Date(firstTs)));
                    const res = await axios_1.default.get(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${parsedInterval}&startTime=${firstTs}`);
                    const data = res.data;
                    klines.push(...data);
                    if (data.length == 0)
                        break;
                    firstTs = data[data.length - 1][6];
                    if (savePath) {
                        (0, fs_1.writeFileSync)(savePath, JSON.stringify(klines));
                        console.log("Sved");
                    }
                    cnt += 1;
                }
            }
            else {
                const res = await axios_1.default.get(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${parsedInterval}&endTime=${end}`);
                klines = res.data;
            }
            if (savePath) {
                (0, funcs_1.ensureDirExists)(savePath);
                (0, fs_1.writeFileSync)(savePath, JSON.stringify(klines));
                console.log("Final Klines Saved");
            }
            console.log(klines.length);
            console.log("DONE FETCHING KLINES");
            return klines;
        }
        catch (err) {
            console.log("FAILED TO GET KLINES", err);
        }
    }
    async getTrades({ start, end, savePath, symbol, }) {
        super.getTrades({ start, end, savePath, symbol });
        try {
            end = end ?? Date.now();
            let trades = [];
            let res = [];
            let cnt = 0;
            if (savePath) {
                console.log("DELETING PREVIOUS DATA...");
                try {
                    (0, fs_1.unlinkSync)(savePath);
                }
                catch (e) {
                    console.log("ERROR REMOVING FILE");
                }
            }
            if (start) {
                let firstTs = start;
                while (firstTs <= end) {
                    console.log(`[Binance] GETTING ${cnt + 1} TRADES...`);
                    console.log((0, funcs2_1.parseDate)(new Date(firstTs)));
                    res = await this.client.publicGetAggTrades({
                        symbol,
                        startTime: firstTs,
                    });
                    const _res = res.map((el) => ({
                        symbol,
                        sz: Number(el.q),
                        px: Number(el.p),
                        ts: (0, funcs2_1.parseDate)(new Date(Number(el.T))),
                    }));
                    trades.push(..._res);
                    if (res.length == 0)
                        break;
                    firstTs = Number(res[res.length - 1].T);
                    if (savePath) {
                        (0, fs_1.writeFileSync)(savePath, JSON.stringify(trades));
                        console.log("SAVED\n");
                    }
                    cnt += 1;
                }
            }
            else {
                res = await this.client.publicGetAggTrades({
                    symbol,
                    endTime: end,
                });
                trades = res.map((el) => ({
                    symbol,
                    sz: Number(el.q),
                    px: Number(el.p),
                    ts: (0, funcs2_1.parseDate)(new Date(Number(el.T))),
                }));
            }
            return trades;
        }
        catch (error) {
            console.log(error);
            return [];
        }
    }
}
exports.TestBinance = TestBinance;
