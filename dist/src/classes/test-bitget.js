"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestBitget = void 0;
const funcs2_1 = require("@/utils/funcs2");
const funcs_1 = require("@/utils/orders/funcs");
const test_platforms_1 = require("./test-platforms");
const bitget_api_1 = require("bitget-api");
const fs_1 = require("fs");
class TestBitget extends test_platforms_1.Platform {
    name = "BITGET";
    maker = 0.1 / 100;
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
            ? process.env.BITGET_API_KEY_DEV
            : process.env.BITGET_API_KEY;
        this.apiSecret = demo
            ? process.env.BITGET_API_SECRET_DEV
            : process.env.BITGET_API_SECRET;
        this.passphrase = process.env.BITGET_PASSPHRASE;
        this.client = new bitget_api_1.RestClientV2({});
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
        console.log(`[ ${isBybit ? "ByBit" : this.name} ] \t GETTING KLINES.. FOR ` +
            symbol);
        if (start) {
            start =
                (isBybit ? start : start) /* - interval * 60 * 1000 */ -
                    20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
        }
        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                console.log(`GETTING ${cnt + 1} KLINES...`);
                const limit = 200;
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(`\nBefore: ${(0, funcs2_1.parseDate)(new Date(firstTs))} \t After: ${(0, funcs2_1.parseDate)(new Date(after))}`);
                console.log("GETTING MARK PRICE");
                const res = await this.client.getSpotHistoricCandles({
                    symbol,
                    granularity: (0, funcs2_1.getInterval)(interval, "bitget"),
                    endTime: Math.round(after),
                    limit: limit,
                });
                let { data } = res;
                if (!data || !data.length)
                    return console.log(data);
                data = data.map((el) => el.map((el) => Number(el)));
                const last = klines.length == 0 ? null : Number(klines[klines.length - 1][0]);
                const _new = Number(data[0][0]);
                console.log("\n", {
                    last: last && (0, funcs2_1.parseDate)(new Date(klines[klines.length - 1][0])),
                    new: (0, funcs2_1.parseDate)(new Date(data[0][0])),
                }, "\n");
                if (last) {
                    if (last >= _new) {
                        console.log("LAST > NEW", data.length);
                    }
                    data = data.filter(el => el[0] > last);
                    console.log(data.length);
                }
                if (!data?.length)
                    break;
                klines.push(...[...data]);
                firstTs =
                    Number(data[data.length - 1][0]) + 2 * interval * 60 * 1000;
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
            const res = await this.client.getSpotHistoricCandles({
                symbol,
                granularity: (0, funcs2_1.getInterval)(interval, "bitget"),
                endTime: end,
            });
            const { data } = res;
            klines = [...data];
        }
        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }
}
exports.TestBitget = TestBitget;
