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
    wsList: TuWs[] = [];
    ok: boolean;
    botsWithPos: IOpenBot[] = [];
    TAG = "WS_BYBIT:";
    isConnectError = false;

    constructor() {
        this.ok = false;
        const { env } = process;

        console.log(env.BYBIT_API_KEY_DEMO, env.BYBIT_API_SECRET_DEMO);
    }

    // async initWs() {
    //     try {
    //         if (this.ws?.ws.readyState == this.ws?.OPEN) this.ws?.close();

    //         this.isConnectError = false;
    //         this.ws = new TuWs(WS_URL_SPOT_PUBLIC, 'bybit');
    //         this.wsList = [this.ws];
    //         console.log("MAIN_BYBIT INIT");
    //         for (let ws of this.wsList) {
    //             ws?.on("open", () => {
    //                 timedLog(this.TAG, "OPEN");
    //             });
    //             ws?.on("error", (e) => {
    //                 console.log(this.TAG, "ERROR", e);
    //                 this.isConnectError = e.stack?.split(" ")[2] == "ENOTFOUND";
    //             });
    //             ws?.on("close", async (e) => {
    //                 console.log(this.TAG, "CLOSED", e);
    //                 if (!this.isConnectError) await this.initWs();
    //             });

    //             // ws?.on("message", async (resp) => {
    //             //     const { channel, data } = ws?.parseData(resp);
    //             //     if (DEV) {
    //             //         timedLog("WS UPDATE");
    //             //         //timedLog(candle);
    //             //     }
    //             //     for (let openBot of this.botsWithPos) {
    //             //         const bot = await Bot.findById(openBot.id).exec();
    //             //         if (!bot?.active) return;
    //             //         if (channel == this.getCandleChannelName(bot!) && data) {
    //             //             const candle = data.map((el) =>
    //             //                 [
    //             //                     el.start,
    //             //                     el.open,
    //             //                     el.high,
    //             //                     el.low,
    //             //                     el.close,
    //             //                     el.volume,
    //             //                     el.confirm,
    //             //                 ].map((el) => Number(el))
    //             //             )[0];
    //             //             /* HANDLE TICKERS */
    //             //             const df = tuCE(
    //             //                 heikinAshi(
    //             //                     parseKlines([...openBot.klines, candle])
    //             //                 )
    //             //             );

    //             //             updateOpenBot(bot, openBot, df);
    //             //         }
    //             //     }
    //             // });
    //         }
    //     } catch (e) {
    //         console.log(e);
    //     }
    // }

    getCandleChannelName(bot: IBot) {
        const interval = getInterval(bot.interval, "bybit");
        const channel = `kline.${interval}.${this.getSymbol(bot)}`;
        return channel;
    }
    async sub(bot: IBot) {
        for (let ws of this.wsList) {
            //ws?.sub(this.getCandleChannelName(bot));
        }
    }
    async unsub(bot: IBot) {
        for (let ws of this.wsList) {
            //ws?.unsub(this.getCandleChannelName(bot));
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

        // try {
        //     const bot = await Bot.findById(botId).exec();

        //     if (!bot) return console.log("BOT NOT FOUND");
        //     const order = await Order.findById(
        //         bot.orders[bot.orders.length - 1]
        //     ).exec();

        //     if (!order) return;

        //     const pricePrecision = getPricePrecision(
        //         [bot.base, bot.ccy],
        //         bot.platform
        //     );
        //     if (pricePrecision == null) return

        //     const plat = new Bybit(bot);
        //     const klines: any[][] = await plat.getKlines({ end: Date.now() });
        //     const row = klines.pop();
        //     if (!row) return timedLog("ROW UNDEFINED");
        //     const open = Number(row[1]);

        //     let tp = open * (1 + TP / 100);
        //     tp = Number(tp.toFixed(pricePrecision));

        //     timedLog({ open, tp });
        //     order.tp = tp;
        //     await order.save();

        //     this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
        //     this.botsWithPos.push({
        //         id: botId,
        //         exitLimit: order?.sell_price ?? 0,
        //         klines,
        //     });

        //     await this.sub(bot);

        //     // SCHEDULE A ONCE OFF JOB TO BE EXEC AT 10 SECS B4 THE NEXT CANDLE
        //     if (first) {
        //         const prev = klines[klines.length - 1];
        //         const ts = Number(prev[0]);
        //         const closeTime = ts + 2 * bot.interval * 60000;
        //         const at = new Date(closeTime - 30 * 1000);
        //         //timedLog("SCHEDULING TIMED:", parseDate(at));
        //         //scheduleJob(at, () => updateBotAtClose(bot));
        //     }
        //     timedLog(`WS: BOT: ${botId} added`);
        // } catch (e) {
        //     console.log(e);
        // }
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



console.log("WS Bybit");
export const wsBybit: WsBybit = new WsBybit();
try {
   // wsBybit.initWs();
} catch (e) {
    timedLog("FAILED TO INIT WS");
    console.log(e);
}
