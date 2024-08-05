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
import {
    DEV,
    getTrailingStop,
    stops,
    demo,
    platforms,
    TP,
    TRAILING_STOP_PERC,
    SL,
} from "@/utils/constants";
import { IObj, IOpenBot } from "@/utils/interfaces";
import { IOrder } from "@/models/order";
import { scheduleJob } from "node-schedule";

const WS_URL_SPOT_PUBLIC = "wss://stream.bybit.com/v5/public/spot";

configDotenv();

export class WsBybit {
    ws: TuWs | undefined;
    wsList: TuWs[]  = [];
    ok: boolean;
    botsWithPos: IOpenBot[] = [];
    TAG = "WS_BYBIT:";
    constructor() { 
        this.ok = false;
        const { env } = process;
       
        console.log(env.BYBIT_API_KEY_DEV, env.BYBIT_API_SECRET_DEV);
        
    }

    async initWs() {
        try{
             if (this.ws?.readyState == this.ws?.OPEN)
            this.ws?.close()
        this.ws = new TuWs(WS_URL_SPOT_PUBLIC);
        this.wsList = [this.ws];
        console.log("MAIN_BYBIT INIT");
        for (let ws of this.wsList) {
            ws?.on("open", () => {
                timedLog(this.TAG, "OPEN");
            });
            ws?.on("error", (e) => {
                console.log(this.TAG, "ERROR", e);
            });
            ws?.on("close", async (e) => {
                console.log(this.TAG, "CLOSED", e);
                if(e != 1006)
                await this.initWs()
            });

            ws?.on("message", async (resp) => {
                const { topic, data } = ws?.parseData(resp);

                for (let openBot of this.botsWithPos) {
                    const bot = await Bot.findById(openBot.id).exec();
                    if (!bot?.active) return;
                    if (topic == this.getCandleChannelName(bot!) && data) {
                        const candle = data.map((el) =>
                            [
                                el.start,
                                el.open,
                                el.high,
                                el.low,
                                el.close,
                                el.volume,
                                el.confirm,
                            ].map((el) => Number(el))
                        )[0];
                        /* HANDLE TICKERS */
                        const df = tuCE(
                            heikinAshi(parseKlines([...openBot.klines, candle]))
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
       catch(e){
        console.log(e);
       }
    }

    getCandleChannelName(bot: IBot) {
        const interval = getInterval(bot.interval, "bybit");
        const channel = `kline.${interval}.${this.getSymbol(bot)}`;
        return channel;
    }
    async sub(bot: IBot) {
        for (let ws of this.wsList) {
         
            ws?.sub(this.getCandleChannelName(bot));
        }
    }
    async unsub(bot: IBot) {
        for (let ws of this.wsList) {
            ws?.unsub(this.getCandleChannelName(bot));
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
    async addBot(botId: ObjectId, first = true) {
        timedLog(`\WS: ADDING BOT: ${botId}...`);

        try {
            const bot = await Bot.findById(botId).exec();

            if (!bot) return console.log("BOT NOT FOUND");
            const order = await Order.findById(
                bot.orders[bot.orders.length - 1]
            ).exec();

            if (!order) return

            const pricePrecision = getPricePrecision([bot.base, bot.ccy], bot.platform)

            const plat = new Bybit(bot);
            const klines: any[][] = await plat.getKlines({end: Date.now()});
            const row = klines.pop()
            if (!row) return timedLog("ROW UNDEFINED")
            const open = Number(row[1])

            let tp = open * (1 + TP/100)
            tp = Number(tp.toFixed(pricePrecision))

            timedLog({open, tp})
            order.tp = tp
            await order.save()
            
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
        } catch (e) {
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
    const order = await Order.findById(
        bot.orders[bot.orders.length - 1]
    ).exec();

    const pos = order && order.side == "sell" && !order.is_closed;
    timedLog("TIMED: ", { sell_px: order?.sell_price, pos });
    if (!pos) return;

    const { sell_price } = order;
    const plat = new Bybit(bot);
    const c = await plat.getTicker();
    timedLog({ ticker: c });
    const _sl = order.buy_price * (1 - stops[bot.interval] / 100);
    const _tp = order.tp;

    if (sell_price < c && c >= _sl) {
        if (c < _tp) {
            return botLog(bot, "TIMED: PRICE BELOW MIN TP");
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
        const order = await Order.findById(
            bot.orders[bot.orders.length - 1]
        ).exec();
        if (!order) return;

        const row = klines[klines.length - 1];
        const prevRow = klines[klines.length - 2];

        const { o, h, c, ts } = row;
        let { sell_price, sl, tp } = order;
        
        const trailingStop = TRAILING_STOP_PERC; // getTrailingStop(bot.interval)
        const initHighs = order.highs.map((el) => el.val!);

        if (DEV){
            timedLog("WS:", {c, all_highs: order.all_highs});
        }
        if (c != initHighs[initHighs.length - 1]) {
            order.highs.push({ ts: parseDate(new Date()), val: c });
            timedLog("ADDING HIGHS...")
        }
        if (c != order.all_highs[order.all_highs.length - 1]) {
            order.all_highs.push({ ts: parseDate(new Date()), val: c });
            timedLog("ADDING ALL_HIGHS...")
        }
        await order.save()

        if (
            bot &&
            order.side == "sell" &&
            !order.is_closed &&
            order.sell_price != 0
        ) {
            if (initHighs.every((el) => el < h)) {
                timedLog("ADJUSTING THE STOP_PRICE");
                // ADJUST _EXIT
                sell_price = h * (1 - trailingStop / 100);
                order.sell_price = sell_price;
                await order.save();
            }

            if (c <= sell_price && c >= sl) {
                if (c >= o && c < tp) {
                    return botLog(bot, "WS: PRICE BELOW MIN TP", { tp, c });
                }
                botLog(bot, `PLACING MARKET SELL ORDER AT EXIT`, {
                    h,
                    sell_price,
                    c,
                    sl, tp
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
                placed = true;
                botLog(bot, "WS: MARKET SELL PLACED. BOT REMOVED");
            }
        } else if (order.is_closed && c >= o && sell_price < o) {
            timedLog("REBUYING AT OPEN...");

            const amt = order.new_ccy_amt - Math.abs(order.sell_fee);

            const res = await placeTrade({
                bot: bot,
                ts: parseDate(ts),
                amt,
                side: "buy",
                price: 0 /* 0 for market buy */,
                plat: plat,
            });

            if (res) {
                await wsBybit.rmvBot(bot.id);
                rmvd = true;
                timedLog("RE-BOUGHT, BOT REMOVED");
            }
        }
    } catch (e) {
        console.log(e);
    } finally {
        if (!rmvd) {
            await wsBybit.resumeBot(bot.id);
        } else if (placed) {
            await wsBybit.rmvBot(bot.id);
        }
    }
};

console.log("WS Bybit");
export const wsBybit: WsBybit = new WsBybit();
try {
    wsBybit.initWs();
} catch (e) {
    timedLog("FAILED TO INIT WS");
    console.log(e);
}