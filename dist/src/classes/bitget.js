"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bitget = void 0;
const funcs2_1 = require("@/utils/funcs2");
const bitget_api_1 = require("bitget-api");
const functions_1 = require("@/utils/functions");
const constants_1 = require("@/utils/constants");
class Bitget {
    name = "BITGET";
    maker = 0.1 / 100;
    taker = 0.1 / 100;
    client;
    apiKey;
    apiSecret;
    passphrase;
    bot;
    constructor(bot) {
        this.apiKey = process.env.BITGET_API_KEY;
        this.apiSecret = process.env.BITGET_API_SECRET;
        this.passphrase = process.env.BITGET_PASSPHRASE;
        this.bot = bot;
        this.client = new bitget_api_1.RestClientV2({
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
            apiPass: this.passphrase,
        });
    }
    async getKlines({ start, end, savePath, interval, symbol, isBybit, }) {
        try {
            interval = interval ?? this.bot.interval;
            end = end ?? Date.now() - interval * 60000;
            let klines = [];
            let done = false;
            symbol = symbol ?? this.getSymbol();
            const _interval = (0, funcs2_1.getInterval)(interval, this.bot.platform);
            console.log(`[ BITGET GETTING KLINES.. FOR ` + symbol);
            const res = await this.client.getSpotCandles({
                symbol,
                granularity: _interval,
                endTime: `${end + interval * 60000}`,
            });
            const { data } = res;
            klines = [...data];
            let d = [...klines];
            const last = Number(d[d.length - 1][0]);
            (0, functions_1.botLog)(this.bot, { end: (0, funcs2_1.parseDate)(end), last: (0, funcs2_1.parseDate)(last) });
            if (end >= last + interval * 60000) {
                (0, functions_1.botLog)(this.bot, "END > LAST");
                await (0, functions_1.sleep)(200);
                return await this.getKlines({ start, end, interval, symbol });
            }
            return d;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getBal(ccy) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getSpotAccountAssets({
                coin: ccy ?? this.bot.ccy,
            });
            if (res.code != "00000") {
                console.log(res);
                return;
            }
            return Number(res.data[0].available);
        }
        catch (error) {
            console.log(error);
        }
    }
    async placeOrder(amt, price, side = "buy", sl, clOrderId) {
        const pair = [this.bot.base, this.bot.ccy];
        const od = { price, sl, amt, side };
        const ordType = price == undefined ? "market" : "limit";
        (0, functions_1.botLog)(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            const { order_type } = this.bot;
            const res = await this.client.spotSubmitOrder({
                symbol: (0, functions_1.getSymbol)(pair, this.bot.platform),
                orderType: ordType,
                side: (0, functions_1.capitalizeFirstLetter)(side),
                size: amt.toString(),
                price: price?.toString(),
                clientOid: clOrderId,
                force: "gtc",
            });
            if (res.code != "00000") {
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);
            return res.data.orderId;
        }
        catch (error) {
            console.log(error);
        }
    }
    async getOrderbyId(orderId, isAlgo = false) {
        try {
            let data = null;
            (0, functions_1.botLog)(this.bot, "GETTING ORDER...");
            const res = await this.client.getSpotOrder({
                orderId: orderId,
            });
            if (res.code != "00000") {
                console.log(res);
                return;
            }
            const list = res.data;
            if (!list[0]) {
                console.log(res);
                (0, functions_1.botLog)(this.bot, "ORDER NOT FOUND");
                return;
            }
            const d = list[0];
            if (constants_1.DEV)
                console.log(d);
            if (list[0].status != "filled") {
                (0, functions_1.botLog)(this.bot, "Order not yet filled", {
                    status: list[0].status,
                });
                return "live";
            }
            data = (0, funcs2_1.parseFilledOrder)(d, this.bot.platform);
            return data;
        }
        catch (error) {
            console.log(error);
        }
    }
    async cancelOrder({ ordId }) {
        try {
            const res = await this.client.spotCancelOrder({
                symbol: this.getSymbol(),
                orderId: ordId,
            });
            if (res.code != "00000") {
                console.log(res);
                return;
            }
            return res.data.orderId;
        }
        catch (e) {
            console.log(e);
            (0, functions_1.botLog)(this.bot, "FAILED TO CANCEL ORDER");
        }
    }
    getSymbol() {
        return (0, functions_1.getSymbol)([this.bot.base, this.bot.ccy], this.bot.platform);
    }
}
exports.Bitget = Bitget;
//# sourceMappingURL=bitget.js.map