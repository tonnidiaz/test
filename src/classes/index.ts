import { IBot } from "@/models/bot";
import { TestBinance } from "./test-binance";
import { Bot, Order } from "@/models";
import { cancelJob, rescheduleJob } from "node-schedule";
import { getJob, placeTrade, updateOrder } from "@/utils/orders/funcs";
import {
    calcEntryPrice,
    calcSL,
    calcTP,
    chandelierExit,
    heikinAshi,
    parseDate,
    parseKlines,
} from "@/utils/funcs2";

import { objStrategies, strategies } from "@/strategies";
import { IOrder } from "@/models/order";
import {
    P_DIFF,
    botJobSpecs,
    isStopOrder,
    slPercent,
    test,
} from "@/utils/constants";
import { botLog, getCoinPrecision } from "@/utils/functions";
import { Bybit } from "./bybit";
import { OKX } from "./okx";
import { afterOrderUpdate } from "@/utils/orders/funcs2";

export class OrderPlacer {
    cnt: number = 0;
    lastCheckAt?: Date;
    bot: IBot;
    constructor(bot: IBot) {
        this.bot = bot;
        botLog(this.bot, "ORDER PLACER INITIALISED");
    }

    async checkPlaceOrder() {
        const bot = await Bot.findById(this.bot._id).exec();
        if (!bot) return;
        const plat = bot.platform == "bybit" ? new Bybit(bot) : new OKX(bot);
        try {
            const now = new Date();
            const currMin = now.getMinutes();

            const mTest =
                test &&
                (
                    await Order.find({
                        bot: bot._id,
                        base: bot.base,
                        ccy: bot.ccy,
                    }).exec()
                ).length <= 4;

            if (test || true)
                console.log(
                    `[ ${bot.name} ]\tCURR_MIN: [${currMin}]\tTEST: ${mTest}\n`
                );

            const prodTimeCond =
                bot.active &&
                currMin % bot.interval == 0 &&
                (this.lastCheckAt
                    ? `${this.lastCheckAt?.getHours()}:${this.lastCheckAt?.getMinutes()}` !=
                      `${now.getHours()}:${now.getMinutes()}`
                    : true);

            if (mTest || prodTimeCond) {
                this.lastCheckAt = new Date();
                cancelJob(getJob(bot._id.toString())!.job);

                const job = getJob(`${bot._id}`)!;
                if (job.active) {
                    await afterOrderUpdate({ bot: bot });
                }
                if (job.active) {
                    rescheduleJob(job.job, botJobSpecs(bot.interval));
                    botLog(bot, "JOB RESUMED");
                }
            }
        } catch (err) {
            console.log(err);
        }
    }
}
