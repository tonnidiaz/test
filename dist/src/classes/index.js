"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderPlacer = void 0;
const models_1 = require("@/models");
const node_schedule_1 = require("node-schedule");
const funcs_1 = require("@/utils/orders/funcs");
const constants_1 = require("@/utils/constants");
const functions_1 = require("@/utils/functions");
const funcs2_1 = require("@/utils/orders/funcs2");
const funcs2_2 = require("@/utils/funcs2");
class OrderPlacer {
    cnt = 0;
    lastCheckAt;
    bot;
    constructor(bot) {
        this.bot = bot;
        (0, functions_1.botLog)(this.bot, "ORDER PLACER INITIALISED");
    }
    async checkPlaceOrder() {
        const bot = await models_1.Bot.findById(this.bot.id).exec();
        if (!bot)
            return;
        const now = new Date();
        const currMin = now.getMinutes();
        const prodTimeCond = bot.active &&
            currMin % bot.interval == 0 &&
            (this.lastCheckAt
                ? `${this.lastCheckAt?.getHours()}:${this.lastCheckAt?.getMinutes()}` !=
                    `${now.getHours()}:${now.getMinutes()}`
                : true);
        try {
            const mTest = constants_1.test && (await (0, funcs2_2.findBotOrders)(bot)).length <= 4;
            if (constants_1.test || true)
                console.log(`[ ${bot.name} ]\tCURR_MIN: [${currMin}]\tTEST: ${mTest}\n`);
            if (mTest || prodTimeCond) {
                this.lastCheckAt = new Date();
                /* PAUSE THE SCHEDULER */
                (0, node_schedule_1.cancelJob)((0, funcs_1.getJob)(bot._id.toString()).job);
                if (bot.active) {
                    const res = await (0, funcs_1.updateOrder)({ bot });
                    await (0, funcs2_1.afterOrderUpdate)({ bot });
                }
            }
        }
        catch (err) {
            console.log(err);
        }
        finally {
            if (prodTimeCond) {
                const job = (0, funcs_1.getJob)(`${bot._id}`);
                const _bot = await models_1.Bot.findById(bot._id).exec();
                if (_bot?.active) {
                    (0, node_schedule_1.rescheduleJob)(job.job, (0, constants_1.botJobSpecs)(_bot.interval));
                    (0, functions_1.botLog)(_bot, "JOB RESUMED");
                }
            }
        }
    }
}
exports.OrderPlacer = OrderPlacer;
//# sourceMappingURL=index.js.map