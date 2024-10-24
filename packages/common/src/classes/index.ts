import { IBot } from "@cmn/models/bot";
import { Bot } from "@cmn/models";
import { cancelJob, rescheduleJob } from "node-schedule";
import { getJob, updateOrder } from "@cmn/utils/orders/funcs";

import { botJobSpecs, test, useWS } from "@cmn/utils/constants";
import { botLog } from "@cmn/utils/functions";
import { afterOrderUpdate } from "@cmn/utils/orders/funcs2";
import { findBotOrders } from "@cmn/utils/funcs2";
import { deactivateBot, reactivateBot } from "@cmn/utils/funcs3";

export class OrderPlacer {
    cnt: number = 0;
    lastCheckAt?: Date;
    bot: IBot;
    constructor(bot: IBot) {
        this.bot = bot;
        botLog(this.bot, "ORDER PLACER INITIALISED");
    }

    async checkPlaceOrder() {
        const bot = await Bot.findById(this.bot.id).exec();
        if (
            !bot ||
            (bot.type == "arbitrage" &&
                bot.arbit_settings?._type == "tri" &&
                bot.arbit_settings.use_ws)
        )
            return;
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
            const mTest = test && (await findBotOrders(bot)).length <= 4;

            if (test || true)
                console.log(
                    `[ ${bot.name} ]\tCURR_MIN: [${currMin}]\tTEST: ${mTest}\n`
                );

            if (mTest || prodTimeCond) {
                this.lastCheckAt = new Date();
                /* PAUSE THE SCHEDULER */
                cancelJob(getJob(bot._id.toString())!.job);

                if (bot.active) {
                    await deactivateBot(bot);
                    await updateOrder({ bot, cancel: true });
                    const res = await afterOrderUpdate({ bot });
                    if (res) {
                        await reactivateBot(bot);
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
