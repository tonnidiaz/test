import { IBot } from "@/models/bot";
import { TuWs } from "./tu";

import { configDotenv } from "dotenv";
import { Bot, Order } from "@/models";
import {
    calcSL,
    calcTP,
    findBotOrders,
    getInterval,
    heikinAshi,
    parseDate,
    parseFilledOrder,
    parseKlines,
    tuCE,
} from "@/utils/funcs2";
import { ObjectId } from "mongoose";
import { botLog, getPricePrecision, timedLog } from "@/utils/functions";
import { Bybit } from "./bybit";
import { placeTrade } from "@/utils/orders/funcs";
import { DEV, getTrailingStop, stops, demo, platforms, TP, TRAILING_STOP_PERC } from "@/utils/constants";
import { IObj, IOpenBot } from "@/utils/interfaces";
import { IOrder } from "@/models/order";
import { scheduleJob } from "node-schedule";
import { WS_URL_SPOT_PUBLIC } from "@/utils/consts";


configDotenv();


let isSubed = false;
export class WsBybit {
    ws: TuWs;
    wsList: TuWs[];
    ok: boolean;
    botsWithPos: IOpenBot[] = [];
    TAG = "WS_BYBIT:"
    constructor() {
        this.ok = false;
        const { env } = process;

        console.log("DEV");
        console.log(
            env.BYBIT_API_KEY_DEV,
            env.BYBIT_API_SECRET_DEV,
        );
        this.ws = new TuWs(WS_URL_SPOT_PUBLIC)
        this.wsList = [ this.ws];
        console.log("MAIN_BYBIT INIT");
    }

    async initWs() {
        for (let ws of this.wsList) {
            ws.on("open", () => {
                timedLog(this.TAG, "OPEN");
            });
            ws.on("error", (e) => {
                console.log(this.TAG, "ERROR", e);
            });
            ws.on("close", (e) => {
                console.log(this.TAG, "CLOSED", e);
            });

            ws.on("message", async (resp) => {
                const { topic, data } = ws.parseData(resp)

                for (let openBot of this.botsWithPos){
                    const bot = await Bot.findById(openBot.id).exec();
                    if (!bot?.active) return;
                     if (topic == this.getCandleChannelName(bot!) && data) {
                        const candle = data.map(el=> [el.start, el.open, el.high, el.low, el.close, el.volume, el.confirm].map(el=> Number(el)))[0]
                    /* HANDLE TICKERS */
                        const df = tuCE(
                            heikinAshi(
                                parseKlines([...openBot.klines, candle])
                            )
                        );
                        if (DEV) {
                            timedLog("WS UPDATE");
                            //timedLog(candle);
                        }
                        updateOpenBot(bot, openBot, df);
                    
                }
                }
               
            });

            
        }
    }

    getCandleChannelName(bot: IBot) {
        const interval = getInterval(bot.interval, "bybit");
        const channel = `kline.${interval}.${this.getSymbol(bot)}`;
        return channel;
    }
    async sub(bot: IBot) {

        for (let ws of this.wsList) {
            
            ws.sub(this.getCandleChannelName(bot));
        }
    }
    async unsub(bot: IBot) {
        for (let ws of this.wsList) {
            ws.unsub(this.getCandleChannelName(bot));
        }
    }
    getSymbol(bot: IBot) {
        return `${bot.base}${bot.ccy}`;
    }

    async pauseBot(botId: ObjectId) {
        timedLog(`\WS: PAUSING BOT: ${botId}...`);
        const bot = await Bot.findById(botId).exec();
        if (bot) {
            await this._unsubBot(bot);
            timedLog("WS: PAUSED...");
        }
    }
    async resumeBot(botId: ObjectId) {
        timedLog(`\WS: RESUMING BOT: ${botId}...`);
        const bot = await Bot.findById(botId).exec();
        if (bot) {
            await this.sub(bot);
            timedLog("WS: BOT RESUMED...");
        }
    }
    async addBot(botId: ObjectId, first = false) {
        timedLog(`\WS: ADDING BOT: ${botId}...`);

        try{
            const bot = await Bot.findById(botId).exec();

            if (!bot) return console.log("BOT NOT FOUND");
            const order = await Order.findById(
                bot.orders[bot.orders.length - 1]
            ).exec();
            const plat = new Bybit(bot);
            const klines = await plat.getKlines({});
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
                timedLog("SCHEDULING TIMED:", parseDate(at));
                scheduleJob(at, () => updateBotAtClose(bot));
            }
            timedLog(`WS: BOT: ${botId} added`);
        }
        catch(e){
            console.log(e);
        }
    }
    async rmvBot(botId: ObjectId) {
        this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
        const bot = await Bot.findById(botId).exec();
        if (bot) await this._unsubBot(bot);
        timedLog(`WS: BOT: ${botId} removed`);
    }

    async _unsubBot(bot: IBot) {
        if (
            !(await Bot.find({ base: bot?.base, ccy: bot?.ccy }).exec()).length
        ) {
            await this.unsub(bot!);
        }
    }
}

const updateBotAtClose = async (_bot: IBot) => {
    timedLog("TIMED: UPDATE AT CLOSE");
    const bot = await Bot.findById(_bot.id).exec();

    if (!bot) return;
    const order = await Order.findById(bot.orders[bot.orders.length - 1]).exec();

    const pos = order && order.side == "sell" && !order.is_closed;
    timedLog("TIMED: ", { sell_px: order?.sell_price, pos });
    if (!pos) return;

    const { sell_price } = order;
    const plat = new Bybit(bot);
    const c = await plat.getTicker();
    timedLog({ticker: c})
    const _sl = order.buy_price * (1- stops[bot.interval]/100)
    const _tp = order.tp

    if (sell_price < c && c >= _sl) {
        if (c >= order.buy_price && c < _tp){
            return botLog(bot, "TIMED: PRICE BELOW MIN TP")
        }
        botLog(
            bot,
            `TIMED: PLACING MARKET SELL ORDER AT CLOSE SINCE IT IS > STOP_PX`,
            { ts: parseDate(new Date()), c, sell_price, _sl }
        );
        const amt = order.base_amt - order.buy_fee;
        const r = await placeTrade({
            bot: bot,
            ts: parseDate(new Date()),
            amt: Number(amt),
            side: "sell",
            plat: plat,
            price: 0,
        });
        if (!r) return botLog(bot, "TIMED: FAILED TO PLACE MARKET SELL ORDER");
        //await wsBybit.rmvBot(bot.id)
        await wsBybit.rmvBot(bot.id);
        botLog(bot, "TIMED: MARKET SELL PLACED. BOT REMOVED");
    }
};

const updateOpenBot = async (bot: IBot, openBot: IOpenBot, klines: IObj[]) => {
    let placed = false,
        rmvd = false;
    try {
        await wsBybit.pauseBot(openBot.id);

        const plat = new Bybit(bot);
        const pricePrecision = getPricePrecision(
            [bot.base, bot.ccy],
            bot.platform
        );
        const order = await Order.findById(
            bot.orders[bot.orders.length - 1]
        ).exec();
        if (!order) return;

        if (
            bot &&
            order.side == "sell" &&
            !order.is_closed &&
            order.sell_price != 0
        ) {

            const trailingStop = TRAILING_STOP_PERC// getTrailingStop(bot.interval)
           

            let { exitLimit } = openBot;
            const row = klines[klines.length - 1];
            const prevRow = klines[klines.length - 2];

            const { o, l, h, c, ha_h, ts } = row;
            const _isGreen = prevRow.c >= o;
            let { stop_price, sell_price } = order;
            const entry = order.buy_price
             const _sl = entry * (1- stops[bot.interval]/100)
             const _tp = o * (1 + TP/100)
            const initHighs = order.highs.map((el) => el.val!);

            order.tp = _tp
            await order.save()
            if (c != initHighs[initHighs.length - 1]) {
                order.highs.push({ ts: parseDate(new Date()), val: c });
                await order.save();
            }
            if (c != initHighs[initHighs.length - 1]) {
                order.all_highs.push({ ts: parseDate(new Date()), val: c });
                await order.save();
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
                await wsBybit.rmvBot(bot.id);
                rmvd = true;
                return;
            }
 */
            // ADJUST STOP_PRICE IF HIGH IS HIGHER THAN ORDER HIGHS

            if (initHighs.every((el) => el < h)) {
                timedLog("ADJUSTING THE STOP_PRICE");
                stop_price = h * (1 - trailingStop / 100);
                order.stop_price = stop_price;

                // ADJUST _EXIT
                sell_price = h * (1 - trailingStop / 100);
                order.sell_price = sell_price;
                await order.save();
            }

            if (c <= sell_price * (1 + 0.0015 / 100) && c >= _sl) {

                if (c >= entry && c < _tp){
                    return botLog(bot, "WS: PRICE BELOW MIN TP", {_tp, c})
                }
                botLog(bot, `PLACING MARKET SELL ORDER AT EXIT`, {
                    h,
                    sell_price,
                    c,
                    _sl
                });
                const amt = order.base_amt - order.buy_fee;
                const r = await placeTrade({
                    bot: bot,
                    ts: parseDate(new Date()),
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: 0,
                });
                if (!r) return botLog(bot, "FAILED TO PLACE MARKET SELL ORDER");
                //await wsBybit.rmvBot(bot.id)
                placed = true;
                botLog(bot, "WS: MARKET SELL PLACED. BOT REMOVED");
            }
        }
    } catch (e) {
        console.log(e);
    } finally {
        if (!placed && !rmvd) {
            await wsBybit.resumeBot(bot.id);
        } else if (placed) {
            await wsBybit.rmvBot(bot.id);
        }
    }
};


console.log("WS Bybit");
export const wsBybit: WsBybit = new WsBybit();
try{
    wsBybit.initWs()
}
catch(e){
    timedLog("FAILED TO INIT WS")
    console.log(e);
}
