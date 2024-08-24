"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGateio = void 0;
const funcs2_1 = require("@/utils/funcs2");
const funcs_1 = require("@/utils/orders/funcs");
const test_platforms_1 = require("./test-platforms");
const gate_api_1 = require("gate-api");
const fs_1 = require("fs");
class TestGateio extends test_platforms_1.Platform {
    name = "GATEIO";
    maker = 0.2 / 100;
    taker = 0.2 / 100;
    client;
    apiKey;
    apiSecret;
    constructor({ demo = false }) {
        super({ demo });
        this.apiKey = process.env.GATEIO_API_KEY;
        this.apiSecret = process.env.GATEIO_API_SECRET;
        const client = new gate_api_1.ApiClient();
        this.client = new gate_api_1.SpotApi(client);
    }
    _parseData(data) {
        /**
              *  0 - Unix timestamp with second precision
                 1 - Trading volume in quote currency
                 2 - Closing price
                 3 - Highest price
                 4 - Lowest price
                 5 - Opening price
                 6 - Trading volume in base currency
                 7 - Whether the window is closed; tr
              */
        return data.map((el) => {
            return el.map((el, i) => i == 0 ? Number(el) * 1000 : el);
        }).map(el => [el[0], el[5], el[3], el[4], el[2], el[1], el[7]]);
    }
    async getKlines({ start, end, savePath, interval, symbol, isBybit, }) {
        console.log({ client: "client", demo: this.demo }, "\n");
        end = end ?? Date.now() - interval * 60000;
        const END = end;
        const diff = 100 * interval * 1000;
        const MIN_DATE = end - diff;
        console.log({
            MIN_DATE: (0, funcs2_1.parseDate)(new Date(MIN_DATE)),
            START: (0, funcs2_1.parseDate)(new Date(start ?? 0)),
        });
        if (start && start < MIN_DATE) {
            //start = MIN_DATE;
            //end = start + diff
        }
        if (end && end > Date.now()) {
            end = Date.now();
        }
        console.log({
            MIN_DATE: (0, funcs2_1.parseDate)(new Date(MIN_DATE)),
            START: (0, funcs2_1.parseDate)(new Date(start ?? 0)),
        });
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
                console.log(`GETTING ${cnt + 1} KLINES...`);
                const limit = 1000;
                const after = firstTs + 100 * interval * 60 * 1000;
                console.log(`Before: ${(0, funcs2_1.parseDate)(new Date(firstTs))} \t After: ${(0, funcs2_1.parseDate)(new Date(after))}`);
                console.log("GETTING MARK PRICE");
                const res = await this.client.listCandlesticks(symbol, {
                    interval: (0, funcs2_1.getInterval)(interval, "gateio"),
                    //from: Math.round(firstTs / 1000),
                    to: Math.round(after / 1000),
                    //limit: limit,
                });
                const data = this._parseData(res.body);
                if (!data?.length)
                    break;
                if (klines.length)
                    console.log({ last: (0, funcs2_1.parseDate)(new Date(klines[klines.length - 1][0])), new: (0, funcs2_1.parseDate)(new Date(data[0][0])) });
                klines.push(...[...data]);
                firstTs = Number(data[data.length - 1][0]) + interval * 60 * 1000;
                console.log(new Date(firstTs).toISOString());
                if (savePath) {
                    (0, funcs_1.ensureDirExists)(savePath);
                    (0, fs_1.writeFileSync)(savePath, JSON.stringify(klines));
                    console.log("Saved");
                }
                cnt += 1;
            }
        }
        else {
            const res = await this.client.listCandlesticks(symbol, {
                interval: (0, funcs2_1.getInterval)(interval, "gateio"),
                from: start ? Math.round(start / 1000) : undefined,
                to: end ? Math.round(end / 1000) : undefined,
            });
            const data = this._parseData(res.body);
            klines = [...data];
        }
        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }
}
exports.TestGateio = TestGateio;
//# sourceMappingURL=test-gateio.js.map