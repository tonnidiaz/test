"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsBybit = exports.WsBybit = void 0;
const tu_1 = require("./tu");
const dotenv_1 = require("dotenv");
const models_1 = require("@/models");
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const bybit_1 = require("./bybit");
const funcs_1 = require("@/utils/orders/funcs");
const constants_1 = require("@/utils/constants");
const WS_URL_SPOT_PUBLIC = "wss://stream.bybit.com/v5/public/spot";
(0, dotenv_1.configDotenv)();
class WsBybit {
    ws;
    wsList = [];
    ok;
    botsWithPos = [];
    TAG = "WS_BYBIT:";
    isConnectError = false;
    constructor() {
        this.ok = false;
        const { env } = process;
        console.log(env.BYBIT_API_KEY_DEV, env.BYBIT_API_SECRET_DEV);
    }
    async initWs() {
        try {
            if (this.ws?.readyState == this.ws?.OPEN)
                this.ws?.close();
            this.isConnectError = false;
            this.ws = new tu_1.TuWs(WS_URL_SPOT_PUBLIC);
            this.wsList = [this.ws];
            console.log("MAIN_BYBIT INIT");
            for (let ws of this.wsList) {
                ws?.on("open", () => {
                    (0, functions_1.timedLog)(this.TAG, "OPEN");
                });
                ws?.on("error", (e) => {
                    console.log(this.TAG, "ERROR", e);
                    this.isConnectError = e.stack?.split(" ")[2] == "ENOTFOUND";
                });
                ws?.on("close", async (e) => {
                    console.log(this.TAG, "CLOSED", e);
                    if (!this.isConnectError)
                        await this.initWs();
                });
                ws?.on("message", async (resp) => {
                    const { topic, data } = ws?.parseData(resp);
                    if (constants_1.DEV) {
                        (0, functions_1.timedLog)("WS UPDATE");
                        //timedLog(candle);
                    }
                    for (let openBot of this.botsWithPos) {
                        const bot = await models_1.Bot.findById(openBot.id).exec();
                        if (!bot?.active)
                            return;
                        if (topic == this.getCandleChannelName(bot) && data) {
                            const candle = data.map((el) => [
                                el.start,
                                el.open,
                                el.high,
                                el.low,
                                el.close,
                                el.volume,
                                el.confirm,
                            ].map((el) => Number(el)))[0];
                            /* HANDLE TICKERS */
                            const df = (0, funcs2_1.tuCE)((0, funcs2_1.heikinAshi)((0, funcs2_1.parseKlines)([...openBot.klines, candle])));
                            updateOpenBot(bot, openBot, df);
                        }
                    }
                });
            }
        }
        catch (e) {
            console.log(e);
        }
    }
    getCandleChannelName(bot) {
        const interval = (0, funcs2_1.getInterval)(bot.interval, "bybit");
        const channel = `kline.${interval}.${this.getSymbol(bot)}`;
        return channel;
    }
    async sub(bot) {
        for (let ws of this.wsList) {
            ws?.sub(this.getCandleChannelName(bot));
        }
    }
    async unsub(bot) {
        for (let ws of this.wsList) {
            ws?.unsub(this.getCandleChannelName(bot));
        }
    }
    getSymbol(bot) {
        return `${bot.base}${bot.ccy}`;
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
        (0, functions_1.timedLog)(`\WS: ADDING BOT: ${botId}...`);
        try {
            const bot = await models_1.Bot.findById(botId).exec();
            if (!bot)
                return console.log("BOT NOT FOUND");
            const order = await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec();
            if (!order)
                return;
            const pricePrecision = (0, functions_1.getPricePrecision)([bot.base, bot.ccy], bot.platform);
            if (pricePrecision == null)
                return;
            const plat = new bybit_1.Bybit(bot);
            const klines = await plat.getKlines({ end: Date.now() });
            const row = klines.pop();
            if (!row)
                return (0, functions_1.timedLog)("ROW UNDEFINED");
            const open = Number(row[1]);
            let tp = open * (1 + constants_1.TP / 100);
            tp = Number(tp.toFixed(pricePrecision));
            (0, functions_1.timedLog)({ open, tp });
            order.tp = tp;
            await order.save();
            this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
            this.botsWithPos.push({
                id: botId,
                exitLimit: order?.sell_price ?? 0,
                klines,
            });
            await this.sub(bot);
            // SCHEDULE A ONCE OFF JOB TO BE EXEC AT 10 SECS B4 THE NEXT CANDLE
            if (first) {
                const prev = klines[klines.length - 1];
                const ts = Number(prev[0]);
                const closeTime = ts + 2 * bot.interval * 60000;
                const at = new Date(closeTime - 30 * 1000);
                //timedLog("SCHEDULING TIMED:", parseDate(at));
                //scheduleJob(at, () => updateBotAtClose(bot));
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
exports.WsBybit = WsBybit;
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
    const plat = new bybit_1.Bybit(bot);
    const c = await plat.getTicker();
    (0, functions_1.timedLog)({ ticker: c });
    const _tp = order.tp;
    if (sell_price < c && sell_price >= _tp) {
        (0, functions_1.botLog)(bot, `TIMED: PLACING MARKET SELL ORDER AT CLOSE SINCE IT IS > STOP_PX`, { ts: (0, funcs2_1.parseDate)(new Date()), c, sell_price, _tp });
        const amt = order.base_amt - order.buy_fee;
        const r = await (0, funcs_1.placeTrade)({
            bot: bot,
            ts: (0, funcs2_1.parseDate)(new Date()),
            amt: Number(amt),
            side: "sell",
            plat: plat,
            price: 0,
            ordType: 'Market'
        });
        if (!r)
            return (0, functions_1.botLog)(bot, "TIMED: FAILED TO PLACE MARKET SELL ORDER");
        await exports.wsBybit.rmvBot(bot.id);
        (0, functions_1.botLog)(bot, "TIMED: MARKET SELL PLACED. BOT REMOVED");
    }
    else {
        (0, functions_1.timedLog)("CLOSE PRICE NOT > SELL_PX", { c, _tp, sell_price });
    }
};
const updateOpenBot = async (bot, openBot, klines) => {
    let placed = false, rmvd = false;
    try {
        await exports.wsBybit.pauseBot(openBot.id);
        const plat = new bybit_1.Bybit(bot);
        const order = await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec();
        if (!order)
            return;
        const row = klines[klines.length - 1];
        const prevRow = klines[klines.length - 2];
        const { o, h, c, ts } = row;
        let { sell_price, sl, tp } = order;
        const trailingStop = constants_1.TRAILING_STOP_PERC; // getTrailingStop(bot.interval)
        const initHighs = order.highs.map((el) => el.val);
        if (constants_1.DEV) {
            (0, functions_1.timedLog)("WS:", { c, all_highs: order.all_highs.length });
        }
        const pricePrecision = (0, functions_1.getPricePrecision)([bot.base, bot.ccy], bot.platform);
        if (pricePrecision == null)
            return;
        if (bot &&
            order.side == "sell" &&
            !order.is_closed &&
            order.sell_price != 0) {
            if (initHighs.every((el) => el < h)) {
                (0, functions_1.timedLog)("ADJUSTING THE STOP_PRICE");
                // ADJUST _EXIT
                sell_price = h * (1 - trailingStop / 100);
                sell_price = Number(sell_price.toFixed(pricePrecision));
                (0, functions_1.timedLog)({ sell_price });
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
                order.highs.push(_high);
                (0, functions_1.timedLog)("ADDING HIGHS...");
            }
            if (h != order.all_highs[order.all_highs.length - 1]) {
                order.all_highs.push(_high);
                (0, functions_1.timedLog)("ADDING ALL_HIGHS...");
            }
            await order.save();
            if (c <= sell_price && sell_price >= tp) {
                (0, functions_1.botLog)(bot, `PLACING MARKET SELL ORDER AT EXIT`, {
                    h,
                    sell_price,
                    c,
                    sl,
                    tp,
                });
                const amt = order.base_amt - order.buy_fee;
                const r = await (0, funcs_1.placeTrade)({
                    bot: bot,
                    ts: (0, funcs2_1.parseDate)(new Date()),
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: 0,
                    ordType: 'Market'
                });
                if (!r)
                    return (0, functions_1.botLog)(bot, "FAILED TO PLACE MARKET SELL ORDER");
                placed = true;
                (0, functions_1.botLog)(bot, "WS: MARKET SELL PLACED. BOT REMOVED");
            }
        }
    }
    catch (e) {
        console.log(e);
    }
    finally {
        if (!rmvd) {
            await exports.wsBybit.resumeBot(bot.id);
        }
        else if (placed) {
            await exports.wsBybit.rmvBot(bot.id);
        }
    }
};
console.log("WS Bybit");
exports.wsBybit = new WsBybit();
try {
    // wsBybit.initWs();
}
catch (e) {
    (0, functions_1.timedLog)("FAILED TO INIT WS");
    console.log(e);
}
//# sourceMappingURL=main-bybit.js.map