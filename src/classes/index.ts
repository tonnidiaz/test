import { IBot } from "@/models/bot";
import { Bot, Order } from "@/models";
import { cancelJob, rescheduleJob } from "node-schedule";
import { getJob, updateOrder } from "@/utils/orders/funcs";

import { botJobSpecs, test } from "@/utils/constants";
import { botLog } from "@/utils/functions";
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
        const now = new Date();
        const currMin = now.getMinutes();

        const prodTimeCond =
            bot.active &&
            currMin % bot.interval == 0 &&
            (this.lastCheckAt
                ? `${this.lastCheckAt?.getHours()}:${this.lastCheckAt?.getMinutes()}` !=
                  `${now.getHours()}:${now.getMinutes()}`
                : true);
        try {
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

            if (mTest || prodTimeCond) {
                this.lastCheckAt = new Date();
                cancelJob(getJob(bot._id.toString())!.job);

                if (bot.active) {
                    const res = await updateOrder(bot);
                    if (!res) {
                        return botLog(
                            bot,
                            "DID NOT GO ON WITH PROCESS SINCE COULD NOT UPDATE ORDER"
                        );
                    } else if (res != "live") {
                        await afterOrderUpdate({ bot: bot });
                    } else {
                        botLog(bot, "[LIVE] ORDER NOT YET FILLED");
                    }
                }
            }
        } catch (err) {
            console.log(err);
        } finally {
            if (prodTimeCond) {
                const job = getJob(`${bot._id}`)!;
                const _bot = await Bot.findById(bot._id).exec();
                if (_bot?.active) {
                    rescheduleJob(job.job, botJobSpecs(_bot.interval));
                    botLog(_bot, "JOB RESUMED");
                }
            }
        }
    }
}
