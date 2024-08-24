"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OKX = void 0;
const funcs_1 = require("@/utils/orders/funcs");
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const fs_1 = require("fs");
const okx_api_1 = require("okx-api");
const constants_1 = require("@/utils/constants");
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
class OKX {
    bot;
    flag;
    apiKey;
    apiSecret;
    passphrase;
    client;
    ws = null;
    constructor(bot) {
        console.log(`\nInit OKX For Bot=${bot.name}\tMode=${bot.demo ? "demo" : "live"}\n`);
        this.bot = bot;
        this.flag = this.bot.demo ? "1" : "0";
        this.apiKey = this.bot.demo
            ? process.env.OKX_API_KEY_DEV
            : process.env.OKX_API_KEY;
        this.apiSecret = this.bot.demo
            ? process.env.OKX_API_SECRET_DEV
            : process.env.OKX_API_SECRET;
        this.passphrase = process.env.OKX_PASSPHRASE;
        this.client = new okx_api_1.RestClient({
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
            apiPass: this.passphrase,
        }, this.bot.demo ? "demo" : "prod");
        (0, functions_1.botLog)(this.bot, "OKX INITIALIZED");
    }
    async getBal(ccy) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getBalance(ccy ?? this.bot.ccy);
            return Number(res[0].details[0].availBal);
        }
        catch (error) {
            console.log(error);
        }
    }
    async getTicker() {
        (0, functions_1.botLog)(this.bot, "GETTING TICKER...");
        const res = await this.client.getTicker(this.getSymbol());
        const ticker = Number(res[0].last);
        console.log({ ticker });
        return ticker;
    }
    async cancelOrder({ ordId, isAlgo }) {
        try {
            (0, functions_1.botLog)(this.bot, "CANCELLING ORDER...");
            const res = await (isAlgo
                ? this.client.cancelAlgoOrder([
                    { algoId: ordId, instId: this.getSymbol() },
                ])
                : this.client.cancelOrder({
                    ordId,
                    instId: this.getSymbol(),
                }));
            if (res[0].sCode != "0") {
                (0, functions_1.botLog)(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res[0]);
                return;
            }
            return ordId;
        }
        catch (error) { }
    }
    async placeOrder(amt, price, side = "buy", sl, clOrderId) {
        /* Place limit order at previous close */
        const od = { price, sl, amt, side };
        (0, functions_1.botLog)(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            let res;
            if (side == "buy") {
                res = await this.client.submitOrder({
                    instId: this.getSymbol(),
                    tdMode: "cash",
                    ordType: "market",
                    side,
                    sz: amt.toString(),
                    clOrdId: clOrderId,
                    //px: price.toString(),
                });
            }
            else {
                if (price) {
                    res = await this.client.placeAlgoOrder({
                        instId: this.getSymbol(),
                        tdMode: "cash",
                        ordType: "conditional",
                        tpTriggerPx: price.toString(),
                        //slTriggerPx: sl.toString(),
                        side,
                        sz: amt.toString(),
                        tpOrdPx: this.bot.order_type == "Market"
                            ? "-1"
                            : (price * (1 - 0.0 / 100)).toString(),
                        /* slOrdPx:
                              this.bot.order_type == "Market"
                                  ? "-1"
                                  : (sl * (1 - 0.0 / 100)).toString(), */
                        algoClOrdId: clOrderId,
                    });
                }
                else {
                    res = await this.client.submitOrder({
                        instId: this.getSymbol(),
                        tdMode: "cash",
                        ordType: "market",
                        side,
                        sz: amt.toString(),
                        clOrdId: clOrderId,
                        //px: price.toString(),
                    });
                }
            }
            if (res[0].sCode != "0") {
                console.log(res[0]);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);
            const d = res[0];
            const id = side == "buy" ? d.ordId : price ? d.algoId : d.ordId;
            return id;
        }
        catch (error) {
            console.log(error);
        }
    }
    async getOrderbyId(orderId, isAlgo = false) {
        try {
            let data = null;
            let finalRes = null;
            console.log(this.bot.name, `IS_ALGO: ${isAlgo}`, orderId);
            const res = isAlgo
                ? await this.client.getAlgoOrderDetails({ algoId: orderId })
                : await this.client.getOrderDetails({
                    ordId: orderId,
                    instId: this.getSymbol(),
                });
            if (constants_1.DEV) {
                console.log(`DEV: ${this.bot.name}`);
                console.log(res);
            }
            if (isAlgo && res[0].state == "effective") {
                (0, functions_1.botLog)(this.bot, "IS_EFFECTIVE");
                return await this.getOrderbyId(res[0].ordId);
            }
            else if (!isAlgo) {
                if (res[0].state == "live")
                    return "live";
                else if (res[0].state == "filled")
                    finalRes = res[0];
            }
            if (!finalRes) {
                (0, functions_1.botLog)(this.bot, "[OKX Class] ORDER NOT YET FILLED");
                return "live";
            }
            //console.log(this.bot.name, "FINAL RES", finalRes);
            data = (0, funcs2_1.parseFilledOrder)(finalRes, this.bot.platform);
            return data;
        }
        catch (error) {
            (0, functions_1.botLog)(this.bot, "ERROR");
            (0, functions_1.botLog)(this.bot, error);
            if (isAlgo && error?.code == "51603")
                return await this.getOrderbyId(orderId);
        }
    }
    async setLev(val) {
        const res = await this.client.setLeverage({
            instId: this.getSymbol(),
            mgnMode: "isolated",
            lever: `${val}`,
        });
        console.log(res);
    }
    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }
    async getKlines({ start, end, savePath, interval, symbol, limit = 100 }) {
        end = end ?? Date.now() - this.bot.interval * 60 * 1000;
        let klines = [];
        let cnt = 0;
        interval = interval ?? this.bot.interval;
        symbol = symbol ?? this.getSymbol();
        (0, functions_1.botLog)(this.bot, "GETTING KLINES.. FOR " + symbol);
        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                console.log(`GETTING ${cnt + 1} KLINES...`);
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(`Before: ${(0, funcs2_1.parseDate)(new Date(firstTs))} \t After: ${(0, funcs2_1.parseDate)(new Date(after))}`);
                const res = await this.client.getCandles(symbol, (0, funcs2_1.getInterval)(interval, "okx"), {
                    before: `${firstTs}`,
                    after: `${after}`,
                    limit: `${limit}`,
                });
                let data = res;
                if (!data.length)
                    break;
                klines.push(...[...data].reverse());
                firstTs = Number(data[0][0]) + interval * 60 * 1000;
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
            const res = await this.client.getCandles(symbol, (0, funcs2_1.getInterval)(interval, "okx"), {
                before: start ? `${start}` : undefined,
                after: end ? `${end}` : undefined,
            });
            let data = res;
            klines = [...data].reverse();
        }
        let d = [...klines];
        const lastCandle = d[d.length - 1];
        //console.log({lastCandle});
        if (false && Number(lastCandle[8]) == 0) {
            (0, functions_1.botLog)(this.bot, "LAST CANDLE NOT YET CLOSED");
            return await this.getKlines({
                start,
                end,
                savePath,
                interval,
                symbol,
            });
        }
        return limit == 1 ? d[d.length - 1] : d;
    }
    getSymbol() {
        return `${this.bot.base}-${this.bot.ccy}`;
    }
}
exports.OKX = OKX;
