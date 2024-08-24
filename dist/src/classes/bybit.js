"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bybit = void 0;
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const bybit_api_1 = require("bybit-api");
const constants_1 = require("@/utils/constants");
class Bybit {
    bot;
    flag;
    apiKey;
    apiSecret;
    passphrase;
    client;
    constructor(bot) {
        console.log(`\nInit BYBIT For Bot=${bot.name}\tMode=${bot.demo ? "demo" : "live"}\n`);
        this.bot = bot;
        this.flag = this.bot.demo ? "1" : "0";
        this.apiKey = this.bot.demo
            ? process.env.BYBIT_API_KEY_DEV
            : process.env.BYBIT_API_KEY;
        this.apiSecret = this.bot.demo
            ? process.env.BYBIT_API_SECRET_DEV
            : process.env.BYBIT_API_SECRET;
        this.passphrase = process.env.BYBIT_PASSPHRASE;
        this.client = new bybit_api_1.RestClientV5({
            key: this.apiKey,
            secret: this.apiSecret,
            demoTrading: this.bot.demo,
        });
    }
    async getBal(ccy) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getWalletBalance({
                accountType: "UNIFIED",
                coin: ccy ?? this.bot.ccy,
            });
            if (res.retCode != 0) {
                console.log(res);
                return;
            }
            return Number(res.result.list[0].coin[0].availableToWithdraw);
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
            const res = await this.client.submitOrder({
                symbol: this.getSymbol(),
                orderType: price == undefined ? 'Market' : "Limit",
                side: (0, functions_1.capitalizeFirstLetter)(side),
                qty: amt.toString(),
                price: price?.toString(),
                category: this.bot.category,
                timeInForce: "GTC",
                orderLinkId: clOrderId
            });
            if (res.retCode != 0) {
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);
            return res.result.orderId;
        }
        catch (error) {
            console.log(error);
        }
    }
    async getOrderbyId(orderId, isAlgo = false) {
        try {
            let data = null;
            (0, functions_1.botLog)(this.bot, "GETTING ORDER...");
            const res = await this.client.getActiveOrders({
                symbol: this.getSymbol(),
                category: this.bot.category,
                orderId: orderId,
            });
            if (res.retCode != 0) {
                console.log(res);
                return;
            }
            const { list } = res.result;
            if (!list[0]) {
                console.log(res);
                (0, functions_1.botLog)(this.bot, "ORDER NOT FOUND");
                return;
            }
            const d = list[0];
            if (constants_1.DEV)
                console.log(d);
            if (list[0].orderStatus != "Filled") {
                (0, functions_1.botLog)(this.bot, "[Bybit class] Order not yet filled");
                return "live";
            }
            data = (0, funcs2_1.parseFilledOrder)(d, this.bot.platform);
            return data;
        }
        catch (error) {
            console.log(error);
        }
    }
    async getTicker() {
        (0, functions_1.botLog)(this.bot, "GETTING TICKER...");
        const res = await this.client.getTickers({
            symbol: this.getSymbol(), category: 'spot'
        });
        const ticker = Number(res.result.list[0].lastPrice);
        console.log({ ticker });
        return ticker;
    }
    async getKlines({ start, end, savePath, interval, symbol, limit = 1000 }) {
        end = end ?? (0, funcs2_1.getExactDate)(this.bot.interval).getTime() - this.bot.interval * 60 * 1000;
        let klines = [];
        let cnt = 0;
        interval = interval ?? this.bot.interval;
        symbol = symbol ?? this.getSymbol();
        console.log("GETTING KLINES...");
        const res = await this.client.getKline({
            symbol,
            interval: interval,
            end: end,
            //start: start,
            limit: 200,
            category: this.bot.category,
        });
        let data = res.result.list;
        klines = [...data].reverse();
        const d = [...klines]; //.reverse()
        const last = Number(d[d.length - 1][0]);
        (0, functions_1.botLog)(this.bot, { end: (0, funcs2_1.parseDate)(end), last: (0, funcs2_1.parseDate)(last) });
        if (end >= last + interval * 60000) {
            (0, functions_1.botLog)(this.bot, "END > LAST");
            return await this.getKlines({ start,
                end,
                savePath,
                interval,
                symbol,
                limit });
        }
        return limit == 1 ? d[d.length - 1] : d;
    }
    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }
    getSymbol() {
        return `${this.bot.base}${this.bot.ccy}`;
    }
    async cancelOrder({ ordId }) {
        try {
            const res = await this.client.cancelOrder({
                orderId: ordId,
                symbol: this.getSymbol(),
                category: this.bot.category,
            });
            if (res.retCode != 0) {
                (0, functions_1.botLog)(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res);
                return;
            }
            return res.result.orderId;
        }
        catch (error) { }
    }
}
exports.Bybit = Bybit;
//# sourceMappingURL=bybit.js.map