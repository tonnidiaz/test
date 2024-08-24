"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gateio = void 0;
const constants_1 = require("@/utils/constants");
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const gate_api_1 = require("gate-api");
class Gateio {
    name = "GATEIO";
    maker = 0.2 / 100;
    taker = 0.2 / 100;
    client;
    apiKey;
    apiSecret;
    bot;
    tradeApi;
    constructor(bot) {
        this.bot = bot;
        this.apiKey = process.env.GATEIO_API_KEY;
        this.apiSecret = process.env.GATEIO_API_SECRET;
        const client = new gate_api_1.ApiClient();
        this.client = new gate_api_1.SpotApi(client);
        this.tradeApi = new gate_api_1.Trade();
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
        return data
            .map((el) => {
            return el.map((el, i) => (i == 0 ? Number(el) * 1000 : el));
        })
            .map((el) => [el[0], el[5], el[3], el[4], el[2], el[1], el[7]]);
    }
    async getKlines({ start, end, savePath, interval, symbol, isBybit, }) {
        end = end ?? Date.now() - interval * 60000;
        const END = end;
        const diff = (10000 - 30) * interval * 60000;
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
        let klines = [];
        let cnt = 0;
        console.log(`GETTING KLINES.. FOR ` + symbol);
        if (start) {
            start =
                (isBybit ? start : start) /* - interval * 60 * 1000 */ -
                    20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
        }
        const res = await this.client.listCandlesticks(symbol, {
            interval: (0, funcs2_1.getInterval)(interval, "gateio"),
            from: start ? Math.round(start / 1000) : undefined,
            to: end ? Math.round(end / 1000) : undefined,
        });
        const data = this._parseData(res.body);
        klines = [...data];
        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }
    async placeOrder(amt, price, side = "buy", sl, clOrderId) {
        const pair = [this.bot.base, this.bot.ccy];
        const od = { price, sl, amt, side };
        const ordType = price == undefined ? 'market' : 'limit';
        (0, functions_1.botLog)(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            const { order_type } = this.bot;
            const res = await this.client.createOrder({
                currencyPair: (0, functions_1.getSymbol)(pair, this.bot.platform),
                type: ordType,
                side: side,
                amount: amt.toString(),
                price: price?.toString(),
            });
            if (res.response.status != 201) {
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);
            return res.body.id;
        }
        catch (error) {
            console.log(error);
        }
    }
    async getOrderbyId(orderId, isAlgo = false) {
        try {
            let data = null;
            (0, functions_1.botLog)(this.bot, "GETTING ORDER...");
            const res = await this.client.getOrder(orderId, (0, functions_1.getSymbol)([this.bot.base, this.bot.ccy], this.bot.platform), {});
            if (res.response.status != 200) {
                console.log(res);
                return;
            }
            const d = res.body;
            if (constants_1.DEV)
                console.log(d);
            if (d.status != gate_api_1.Order.Status.Closed) {
                (0, functions_1.botLog)(this.bot, "Order not yet filled", { status: d.status });
                return "live";
            }
            data = (0, funcs2_1.parseFilledOrder)(d, this.bot.platform);
            return data;
        }
        catch (error) {
            console.log(error);
        }
    }
}
exports.Gateio = Gateio;
