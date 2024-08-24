"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestMexc = void 0;
const funcs2_1 = require("@/utils/funcs2");
const funcs_1 = require("@/utils/orders/funcs");
const test_platforms_1 = require("./test-platforms");
const fs_1 = require("fs");
const Mexc = __importStar(require("mexc-api-sdk"));
class TestMexc extends test_platforms_1.Platform {
    name = "MEXC";
    maker = 0.1 / 100;
    taker = 0.1 / 100;
    client;
    apiKey;
    apiSecret;
    passphrase;
    constructor({ demo = false }) {
        super({ demo });
        this.apiKey = process.env.MEXC_API_KEY;
        this.apiSecret = process.env.MEXC_API_SECRET;
        this.passphrase = process.env.MEXC_PASSPHRASE;
        this.client = new Mexc.Spot();
    }
    async getKlines({ start, end, savePath, interval, symbol, isBybit, }) {
        console.log({ client: "client", demo: this.demo }, "\n");
        end = end ?? Date.now() - interval * 60000;
        const END = end;
        const diff = (10000 - 30) * interval * 60000;
        const MIN_DATE = end - diff;
        if (start && start < MIN_DATE) {
            //start = MIN_DATE;
            //end = start + diff
        }
        if (end && end > Date.now()) {
            //end = Date.now();
        }
        console.log({
            MIN_DATE: (0, funcs2_1.parseDate)(new Date(MIN_DATE)),
            START: (0, funcs2_1.parseDate)(new Date(start ?? 0)),
        });
        let klines = [];
        let done = false;
        let cnt = 0;
        console.log(` GETTING KLINES.. FOR ` + symbol);
        if (start) {
            start =
                (isBybit ? start : start) /* - interval * 60 * 1000 */ -
                    20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
        }
        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                console.log(`MEXC GETTING ${cnt + 1} KLINES...`);
                const limit = 1000;
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(`\nBefore: ${(0, funcs2_1.parseDate)(new Date(firstTs))} \t After: ${(0, funcs2_1.parseDate)(new Date(after))}`);
                console.log("GETTING MARK PRICE");
                const res = await this.client.klines(symbol, (0, funcs2_1.getInterval)(interval, "mexc"), {
                    startTime: firstTs,
                    endTime: Math.round(after),
                    limit: limit,
                });
                let data = res;
                if (!data || !data.length) {
                    console.log(data);
                    if (data)
                        break;
                    return;
                }
                data = data.map((el) => el.map((el) => Number(el)));
                const last = klines.length != 0 && Number(klines[klines.length - 1][0]);
                const _new = Number(data[0][0]);
                console.log("\n", {
                    last: last &&
                        (0, funcs2_1.parseDate)(new Date(klines[klines.length - 1][0])),
                    new: (0, funcs2_1.parseDate)(new Date(data[0][0])),
                }, "\n");
                if (last) {
                    if (last >= _new) {
                        console.log("LAST > NEW");
                    }
                    data = data.filter((el) => el[0] > last);
                }
                if (!data?.length)
                    break;
                klines.push(...[...data]);
                firstTs =
                    Number(data[data.length - 1][0]) + 1 * interval * 60 * 1000;
                console.log(new Date(firstTs).toISOString());
                if (savePath) {
                    (0, funcs_1.ensureDirExists)(savePath);
                    (0, fs_1.writeFileSync)(savePath, JSON.stringify(klines));
                    console.log("Saved");
                }
                if (done) {
                    break;
                }
                cnt += 1;
            }
        }
        else {
            const res = await this.client.klines(symbol, (0, funcs2_1.getInterval)(interval, "mexc"), { endTime: end, startTime: start });
            const data = res;
            klines = [...data];
        }
        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }
}
exports.TestMexc = TestMexc;
