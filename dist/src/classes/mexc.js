"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mexc = void 0;
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const constants_1 = require("@/utils/constants");
const mexc_api_sdk_1 = require("mexc-api-sdk");
class Mexc {
    bot;
    apiKey;
    apiSecret;
    passphrase;
    client;
    constructor(bot) {
        this.bot = bot;
        this.apiKey = process.env.MEXC_API_KEY;
        this.apiSecret = process.env.MEXC_API_SECRET;
        this.passphrase = process.env.MEXC_PASSPHRASE;
        this.client = new mexc_api_sdk_1.Spot(this.apiKey, this.apiSecret);
    }
    async getBal(ccy) {
        (0, functions_1.botLog)(this.bot, "GETTING BAL...");
        try {
            const res = await this.client.accountInfo();
            if (!res.canTrade) {
                console.log(res);
                return;
            }
            return Number(res.balances.find((el) => el.asset == ccy ?? this.bot.ccy)
                ?.free ?? 0);
        }
        catch (error) {
            console.log(error);
        }
    }
    async placeOrder(amt, price, side = "buy", sl, clOrderId) {
        const od = { price, sl, amt, side };
        (0, functions_1.botLog)(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            const { order_type } = this.bot;
            const is_market = price == undefined;
            const res = await this.client.newOrder(this.getSymbol(), side.toUpperCase(), (is_market ? "Market" : "Limit").toUpperCase(), {
                quantity: !is_market ? amt.toString() : undefined,
                quoteOrderQty: is_market ? amt.toString() : undefined,
                price: price?.toString(),
                newClientOrderId: clOrderId,
            });
            if (!res.orderId) {
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);
            return res.orderId;
        }
        catch (error) {
            //[ 'statusCode', 'headers', 'body', 'url' ]
            this._parseErr(error);
        }
    }
    _parseErr(error) {
        error = error?.body ? JSON.parse(error.body) : error;
        console.log(error.msg);
    }
    async getOrderbyId(orderId, isAlgo = false) {
        try {
            let data = null;
            (0, functions_1.botLog)(this.bot, "GETTING ORDER...");
            const res = await this.client.queryOrder(this.getSymbol(), {
                orderId,
            });
            if (!res.symbol) {
                console.log(res);
                return;
            }
            const d = res;
            if (constants_1.DEV)
                console.log(d);
            if (res.status.toLowerCase() != "filled") {
                (0, functions_1.botLog)(this.bot, "Order not yet filled");
                return "live";
            }
            data = (0, funcs2_1.parseFilledOrder)(d, this.bot.platform);
            return data;
        }
        catch (error) {
            this._parseErr(error);
        }
    }
    async getTicker() {
        try {
            (0, functions_1.botLog)(this.bot, "GETTING TICKER...");
            const res = await this.client.tickerPrice(this.getSymbol());
            const ticker = Number(res.price);
            console.log({ ticker });
            return ticker;
        }
        catch (e) {
            this._parseErr(e);
        }
    }
    async getKlines({ start, end, savePath, interval, symbol, limit = 500, }) {
        try {
            if (end) {
                console.log("HAS END", (0, funcs2_1.parseDate)(new Date(end)));
            }
            interval = interval ?? this.bot.interval;
            end = end ?? Date.now() - 2 * interval * 60000;
            let klines = [];
            let cnt = 0;
            symbol = symbol ?? this.getSymbol();
            end += (interval * 60000);
            const res = await this.client.klines(this.getSymbol(), (0, funcs2_1.getInterval)(interval, "mexc"), {
            //endTime: end, startTime: (end)  - (limit) * interval * 60000 
            });
            const data = res;
            klines = [...data];
            const d = [...klines]; //.reverse()
            return limit == 1 ? d[d.length - 1] : d;
        }
        catch (e) {
            return this._parseErr(e);
        }
    }
    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }
    getSymbol() {
        return (0, functions_1.getSymbol)([this.bot.base, this.bot.ccy], "mexc");
    }
    async cancelOrder({ ordId }) {
        try {
            const res = await this.client.cancelOrder(this.getSymbol(), {
                orderId: ordId,
            });
            if (!res.symbol) {
                (0, functions_1.botLog)(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res);
                return;
            }
            return res.orderId;
        }
        catch (error) {
            this._parseErr(error);
        }
    }
}
exports.Mexc = Mexc;
