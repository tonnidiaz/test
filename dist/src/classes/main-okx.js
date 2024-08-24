"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsOkx = exports.WsOKX = void 0;
const okx_api_1 = require("okx-api");
const dotenv_1 = require("dotenv");
const models_1 = require("@/models");
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const okx_1 = require("./okx");
const funcs_1 = require("@/utils/orders/funcs");
const constants_1 = require("@/utils/constants");
const node_schedule_1 = require("node-schedule");
(0, dotenv_1.configDotenv)();
let isSubed = false;
const demo = true; //TODO Change to false
class WsOKX {
    passphrase;
    ws;
    wsDemo;
    wsList;
    inst;
    ok;
    botsWithPos = [];
    constructor() {
        this.ok = false;
        this.inst = this;
        const { env } = process;
        this.passphrase = env.OKX_PASSPHRASE;
        console.log(env.OKX_API_KEY, env.OKX_API_SECRET, this.passphrase);
        console.log("DEV");
        console.log(env.OKX_API_KEY_DEV, env.OKX_API_SECRET_DEV, this.passphrase);
        this.ws = new okx_api_1.WebsocketClient({
            accounts: [
                {
                    apiKey: env.OKX_API_KEY,
                    apiPass: this.passphrase,
                    apiSecret: env.OKX_API_SECRET,
                },
            ],
            market: "prod",
        });
        this.wsDemo = new okx_api_1.WebsocketClient({
            accounts: [
                {
                    apiKey: env.OKX_API_KEY_DEV,
                    apiPass: this.passphrase,
                    apiSecret: env.OKX_API_SECRET_DEV,
                },
            ],
            market: "demo",
        });
        this.wsList = [demo ? this.wsDemo : this.ws];
        console.log("MAIN_OKX INIT");
    }
    async initWs() {
        for (let ws of this.wsList) {
            ws.connectPrivate();
            ws.on("open", (e) => {
                (0, functions_1.timedLog)("WEB SOCKET CONNECTED");
            });
            ws.on("error", (e) => {
                console.log("WEB SOCKET ERROR");
            });
            ws.on("close", (e) => {
                console.log("WEB SOCKET CLOSED");
            });
            ws.on("response", (resp) => {
                const { event } = resp;
                if (event == "login") {
                    if (resp.code != "0") {
                        console.log("FAILED TO LOGIN...");
                        return;
                    }
                    this.ok = true;
                    (0, functions_1.timedLog)("WS AUTH SUCCESS");
                    (0, functions_1.timedLog)("SUBSCRIBING...");
                    //ws.subscribe({ channel: "orders", instType: "ANY" });
                    //ws.subscribe({
                    //    channel: "orders-algo",
                    //    instType: "ANY",
                    //});
                }
            });
            ws.on("update", async (e) => {
                const { data, arg } = e;
                for (let botId of this.botsWithPos) {
                    const bot = await models_1.Bot.findById(botId.id).exec();
                    if (!bot?.active)
                        return;
                    if (arg.channel == this.getCandleChannelName(bot)) {
                        /* HANDLE TICKERS */
                        for (let openBot of this.botsWithPos) {
                            const df = (0, funcs2_1.tuCE)((0, funcs2_1.heikinAshi)((0, funcs2_1.parseKlines)([...openBot.klines, ...e.data])));
                            if (constants_1.DEV) {
                                (0, functions_1.timedLog)("WS UPDATE");
                                //timedLog(candle);
                            }
                            updateOpenBot(bot, openBot, df);
                        }
                    }
                }
            });
        }
    }
    getCandleChannelName(bot) {
        const interval = (0, funcs2_1.getInterval)(bot.interval, "okx");
        const channel = `candle${interval}`;
        return channel;
    }
    async sub(bot) {
        const symbol = this.getSymbol(bot);
        for (let ws of this.wsList) {
            ws.subscribe({
                channel: this.getCandleChannelName(bot),
                instId: symbol,
            });
        }
    }
    async unsub(bot) {
        const symbol = this.getSymbol(bot);
        for (let ws of this.wsList) {
            ws.unsubscribe({
                channel: this.getCandleChannelName(bot),
                instId: symbol,
            });
        }
    }
    getSymbol(bot) {
        return `${bot.base}-${bot.ccy}`;
    }
    async pauseBot(botId) {
        (0, functions_1.timedLog)(`\WS: PAUSING BOT: ${botId}...`);
        const bot = await models_1.Bot.findById(botId).exec();
        if (bot) {
            await this._unsubBot(bot);
            (0, functions_1.timedLog)("WS: PAUSED...");
        }
    }
    async resumeBot(botId) {
        (0, functions_1.timedLog)(`\WS: RESUMING BOT: ${botId}...`);
        const bot = await models_1.Bot.findById(botId).exec();
        if (bot) {
            await this.sub(bot);
            (0, functions_1.timedLog)("WS: BOT RESUMED...");
        }
    }
    async addBot(botId, first = true) {
        (0, functions_1.timedLog)(`\WS: ADDING BOT: ${botId}...`, { first });
        try {
            const bot = await models_1.Bot.findById(botId).exec();
            if (!bot)
                return console.log("BOT NOT FOUND");
            const order = await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec();
            const plat = new okx_1.OKX(bot);
            const klines = await plat.getKlines({});
            this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
            this.botsWithPos.push({
                id: botId,
                exitLimit: order.sell_price,
                klines,
            });
            await this.sub(bot);
            // SCHEDULE A ONCE OFF JOB TO BE EXEC AT 10 SECS B4 THE NEXT CANDLE
            if (first) {
                const prev = klines[klines.length - 1];
                const ts = Number(prev[0]);
                const closeTime = ts + 2 * bot.interval * 60000;
                const at = new Date(closeTime - 30 * 1000);
                (0, functions_1.timedLog)("SCHEDULING TIMED:", (0, funcs2_1.parseDate)(at));
                (0, node_schedule_1.scheduleJob)(at, () => updateBotAtClose(bot));
            }
            (0, functions_1.timedLog)(`WS: BOT: ${botId} added`);
        }
        catch (e) {
            console.log(e);
        }
    }
    async rmvBot(botId) {
        this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
        const bot = await models_1.Bot.findById(botId).exec();
        if (bot)
            await this._unsubBot(bot);
        (0, functions_1.timedLog)(`WS: BOT: ${botId} removed`);
    }
    async _unsubBot(bot) {
        if (!(await models_1.Bot.find({ base: bot?.base, ccy: bot?.ccy }).exec()).length) {
            await this.unsub(bot);
        }
    }
}
exports.WsOKX = WsOKX;
const updateBotAtClose = async (_bot) => {
    (0, functions_1.timedLog)("TIMED: UPDATE AT CLOSE");
    const bot = await models_1.Bot.findById(_bot.id).exec();
    if (!bot)
        return;
    const order = await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec();
    const pos = order && order.side == "sell" && !order.is_closed;
    (0, functions_1.timedLog)("TIMED: ", { sell_px: order?.sell_price, pos });
    if (!pos)
        return;
    const { sell_price } = order;
    const plat = new okx_1.OKX(bot);
    const c = await plat.getTicker();
    (0, functions_1.timedLog)({ ticker: c });
    const _sl = order.buy_price * (1 - constants_1.stops[bot.interval] / 100);
    const _tp = order.tp;
    if (sell_price < c && c >= _sl) {
        if (c >= order.buy_price && c < _tp) {
            return (0, functions_1.botLog)(bot, "TIMED: PRICE BELOW MIN TP");
        }
        (0, functions_1.botLog)(bot, `TIMED: PLACING MARKET SELL ORDER AT CLOSE SINCE IT IS > STOP_PX`, { ts: (0, funcs2_1.parseDate)(new Date()), c, sell_price, _sl });
        const amt = order.base_amt - order.buy_fee;
        const r = await (0, funcs_1.placeTrade)({
            bot: bot,
            ts: (0, funcs2_1.parseDate)(new Date()),
            amt: Number(amt),
            side: "sell",
            plat: plat,
            price: 0,
        });
        if (!r)
            return (0, functions_1.botLog)(bot, "TIMED: FAILED TO PLACE MARKET SELL ORDER");
        //await wsOkx.rmvBot(bot.id)
        await exports.wsOkx.rmvBot(bot.id);
        (0, functions_1.botLog)(bot, "TIMED: MARKET SELL PLACED. BOT REMOVED");
    }
};
const updateOpenBot = async (bot, openBot, klines) => {
    let placed = false, rmvd = false;
    try {
        await exports.wsOkx.pauseBot(openBot.id);
        const plat = new okx_1.OKX(bot);
        const pricePrecision = (0, functions_1.getPricePrecision)([bot.base, bot.ccy], bot.platform);
        if (pricePrecision == null)
            return;
        const order = await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec();
        if (!order)
            return;
        if (bot &&
            order.side == "sell" &&
            !order.is_closed &&
            order.sell_price != 0) {
            const trailingStop = constants_1.TRAILING_STOP_PERC; // getTrailingStop(bot.interval)
            let { exitLimit } = openBot;
            const row = klines[klines.length - 1];
            const prevRow = klines[klines.length - 2];
            const { o, l, h, c, ha_h, ts } = row;
            const _isGreen = prevRow.c >= o;
            let { sl, tp, sell_price } = order;
            const entry = order.buy_price;
            const _sl = entry * (1 - constants_1.stops[bot.interval] / 100);
            const _tp = o * (1 + constants_1.TP / 100);
            const initHighs = order.highs.map((el) => el.val);
            order.tp = _tp;
            if (constants_1.DEV) {
                (0, functions_1.timedLog)("WS", { row });
            }
            // STOP LISTENING IF L <= O TRAILING STOP
            const lFromO = ((o - l) / l) * 100;
            /* if (!_isGreen && lFromO >= trailingStop) {
                timedLog("LOW REACHED O TRAILER...SKIPPING", {
                    o,
                    l,
                    lFromO,
                    c,
                });
                await wsOkx.rmvBot(bot.id);
                rmvd = true;
                return;
            }
 */
            // ADJUST STOP_PRICE IF HIGH IS HIGHER THAN ORDER HIGHS
            if (initHighs.every((el) => el < h)) {
                (0, functions_1.timedLog)("ADJUSTING THE STOP_PRICE");
                // ADJUST _EXIT
                sell_price = h * (1 - trailingStop / 100);
                order.sell_price = sell_price;
                await order.save();
            }
            const _high = {
                ts: (0, funcs2_1.parseDate)(new Date()),
                val: h,
                tp,
                px: sell_price,
            };
            if (h != initHighs[initHighs.length - 1]) {
                order.highs = [_high];
                (0, functions_1.timedLog)("ADDING HIGHS...");
            }
            if (h != order.all_highs[order.all_highs.length - 1]) {
                order.all_highs = [_high];
                (0, functions_1.timedLog)("ADDING ALL_HIGHS...");
            }
            await order.save();
            if (c <= sell_price && c >= _sl) {
                if (c >= entry && c < _tp) {
                    return (0, functions_1.botLog)(bot, "WS: PRICE BELOW MIN TP", { _tp, c });
                }
                (0, functions_1.botLog)(bot, `PLACING MARKET SELL ORDER AT EXIT`, {
                    h,
                    sell_price,
                    c,
                    _sl
                });
                const amt = order.base_amt - order.buy_fee;
                const r = await (0, funcs_1.placeTrade)({
                    bot: bot,
                    ts: (0, funcs2_1.parseDate)(new Date()),
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: 0,
                });
                if (!r)
                    return (0, functions_1.botLog)(bot, "FAILED TO PLACE MARKET SELL ORDER");
                //await wsOkx.rmvBot(bot.id)
                placed = true;
                (0, functions_1.botLog)(bot, "WS: MARKET SELL PLACED. BOT REMOVED");
            }
        }
    }
    catch (e) {
        console.log(e);
    }
    finally {
        if (!placed && !rmvd) {
            await exports.wsOkx.resumeBot(bot.id);
        }
        else if (placed) {
            await exports.wsOkx.rmvBot(bot.id);
        }
    }
};
const updateOrder = async ({ order, isBuyOrder, orderDetails, bot, }) => {
    if (isBuyOrder) {
        /* UPDATE BUY ORDER */
        (0, functions_1.botLog)(bot, `WS: Updating buy order`);
    }
    else {
        (0, functions_1.botLog)(bot, `WS: Updating sell order`);
        /* UPDATE SELL ORDER */
        /* THEN WHEN THE TIME COMES, A BUY ORDER WILL BE PLACED BASED ON SIGNALS */
        const fee = Math.abs(orderDetails.fee); // In USDT
        /* Buy/Base fee already removed when placing sell order  */
        order.new_ccy_amt = orderDetails.fillSz * orderDetails.fillPx;
        order.sell_price = orderDetails.fillPx;
        order.is_closed = true;
        order.sell_fee = fee;
        order.sell_timestamp = {
            ...order.sell_timestamp,
            o: (0, funcs2_1.parseDate)(new Date(orderDetails.fillTime)),
        };
        /* order == currentOrder */
        const bal = order.new_ccy_amt - Math.abs(orderDetails.fee);
        const profit = ((bal - order.ccy_amt) / order.ccy_amt) * 100;
        order.profit = profit;
        order.order_id = orderDetails.id;
        await order.save();
    }
};
console.log("WS OKX");
exports.wsOkx = new WsOKX();
try {
    //wsOkx.initWs()
}
catch (e) {
    (0, functions_1.timedLog)("FAILED TO INIT WS");
    console.log(e);
}
//# sourceMappingURL=main-okx.js.map