"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_mid_1 = require("@/middleware/auth.mid");
const models_1 = require("@/models");
const constants_1 = require("@/utils/constants");
const funcs_1 = require("@/utils/orders/funcs");
const functions_1 = require("@/utils/functions");
const express_1 = __importDefault(require("express"));
const main_okx_1 = require("@/classes/main-okx");
const main_bybit_1 = require("@/classes/main-bybit");
const funcs2_1 = require("@/utils/funcs2");
const router = express_1.default.Router();
router.get("/", async (req, res) => {
    try {
        const { query } = req;
        const username = query.user;
        const user = username ? await models_1.User.findOne({ username }).exec() : null;
        //console.log(user);
        if (username && !user)
            return (0, functions_1.tunedErr)(res, 404, "Bot not found");
        const bots = user
            ? await models_1.Bot.find({ user: user.id }).exec()
            : await models_1.Bot.find().exec();
        res.json(bots.map((e) => e.toJSON()).reverse());
    }
    catch (error) {
        return (0, functions_1.tunedErr)(res, 500, "Failed to get bots");
    }
});
router.post("/create", auth_mid_1.authMid, async (req, res) => {
    try {
        const body = req.body;
        const bot = new models_1.Bot();
        for (let k of Object.keys(body)) {
            bot.set(k, body[k]);
        }
        [bot.base, bot.ccy] = body.pair ?? body.symbol;
        const user = await models_1.User.findOne({ username: body.user }).exec();
        if (!user)
            return (0, functions_1.tunedErr)(res, 400, "User account not available");
        bot.user = user.id;
        const total_quote = { base: bot.base, ccy: bot.ccy, amt: bot.start_bal };
        bot.total_quote.push(total_quote);
        const aside = { base: bot.base, ccy: bot.ccy, amt: 0 };
        bot.aside.push(aside);
        bot.start_bal = bot.start_amt;
        await bot.save();
        user.bots.push(bot.id);
        await user.save();
        res.json(bot.toJSON());
    }
    catch (error) {
        console.log(error);
        return (0, functions_1.tunedErr)(res, 500, "Failed to create bot");
    }
});
const calcCurrAmt = async (bot) => {
    const order = await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec();
    let amt = order?.is_closed ? (0, funcs2_1.getAmtToBuyWith)(bot, order) : order?.ccy_amt;
    const pxPr = (0, functions_1.getPricePrecision)([bot.base, bot.ccy], bot.platform);
    return (0, functions_1.toFixed)(amt ?? 0, pxPr ?? 2);
};
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let bot = await models_1.Bot.findById(id).exec();
        if (!bot)
            return (0, functions_1.tunedErr)(res, 404, "Bot not found");
        bot = await bot.populate("orders");
        res.json({ ...bot.toJSON(), curr_amt: await calcCurrAmt(bot) });
    }
    catch (error) {
        console.log(error);
        return (0, functions_1.tunedErr)(res, 500, "Failed to get bot");
    }
});
router.post("/:id/clear-orders", auth_mid_1.authMid, async (req, res) => {
    const { id } = req.params;
    let bot = await models_1.Bot.findById(id).exec();
    if (!bot)
        return (0, functions_1.tunedErr)(res, 404, "Bot not found");
    console.log(bot.orders.length);
    for (let oid of bot.orders) {
        console.log(oid);
        const order = await models_1.Order.findById(oid);
        if (order) {
            console.log(`DELETING ORDER ` + oid);
            await models_1.Order.findByIdAndRemove(oid).exec();
            console.log("Order deleted");
        }
        bot.orders = bot?.orders.filter((el) => el != oid);
        await bot.save();
    }
    bot = await bot.populate("orders");
    res.json({ ...bot.toJSON(), curr_amt: await calcCurrAmt(bot) });
});
router.post("/:id/edit", auth_mid_1.authMid, async (req, res) => {
    try {
        const { id } = req.params;
        const bot = await models_1.Bot.findById(id).exec();
        if (!bot)
            return (0, functions_1.tunedErr)(res, 404, "Bot not found");
        const fd = req.body;
        const { key, val } = fd;
        const jobId = `${bot._id}`;
        const bool = constants_1.jobs.find((el) => el.id == jobId);
        (0, functions_1.botLog)(bot, "UNSUB TO PREV SYMBOL TICKERS...");
        const ws = bot.platform == 'bybit' ? main_bybit_1.wsBybit : main_okx_1.wsOkx;
        await ws.rmvBot(bot.id);
        if (key == "active") {
            if (bool && !val) {
                // Deactivate JOB
                //schedule.cancelJob(bool.job);
                bool.job.cancel();
                const jobIndex = constants_1.jobs.findIndex((el) => el.id == jobId);
                constants_1.jobs[jobIndex] = { ...bool, active: false };
                (0, functions_1.botLog)(bot, `Job ${bool.id} cancelled`);
            }
            else if (val) {
                console.log("Resuming JOB...");
                if (!bool)
                    await (0, funcs_1.addBotJob)(bot);
                else {
                    const r = bool.job.reschedule((0, constants_1.botJobSpecs)(bot.interval)); //schedule.rescheduleJob(bool.job, botJobSpecs);
                    if (!r) {
                        (0, functions_1.botLog)(bot, "FAILED TO RESUME JOB");
                    }
                    const jobIndex = constants_1.jobs.findIndex((el) => el.id == jobId);
                    constants_1.jobs[jobIndex] = { ...bool, active: true };
                }
            }
            bot.set(key, val);
            (0, functions_1.botLog)(bot, "DONE ADDING/PAUSING JOB");
        }
        else if (key == "multi") {
            for (let k of Object.keys(val)) {
                const v = val[k];
                if (k == "pair" || k == "symbol") {
                    bot.set("base", v[0]);
                    bot.set("ccy", v[1]);
                }
                bot.set(k, v);
            }
        }
        await bot.save();
        if (bot.active) {
            if (key == "multi") {
                /* RESCADULE IN CASE INTERVAL CHANGED */
                if (bool) {
                    const r = bool.job.reschedule((0, constants_1.botJobSpecs)(bot.interval)); //schedule.rescheduleJob(bool.job, botJobSpecs);
                    if (!r) {
                        (0, functions_1.botLog)(bot, "FAILED TO RESUME JOB");
                    }
                    const jobIndex = constants_1.jobs.findIndex((el) => el.id == jobId);
                    constants_1.jobs[jobIndex] = { ...bool, active: true };
                }
            }
            (0, functions_1.botLog)(bot, "RE-SUB TO TICKERS...");
            if (bot.orders.length) {
                const order = await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec();
                if (order && order.side == 'sell' && !order.is_closed && order.sell_price != 0) {
                    await ws.addBot(bot.id, true);
                }
            }
        }
        else {
            //await ws.rmvBot(bot.id)
        }
        res.json({ ...(await bot.populate("orders")).toJSON(), curr_amt: await calcCurrAmt(bot) });
    }
    catch (error) {
        console.log(error);
        return (0, functions_1.tunedErr)(res, 500, "Failed to edit bot");
    }
});
router.post("/:id/delete", auth_mid_1.authMid, async (req, res) => {
    try {
        const { id } = req.params;
        const bot = await models_1.Bot.findById(id).exec();
        if (!bot)
            return (0, functions_1.tunedErr)(res, 400, "BOT NOT FOUND");
        const orders = bot.orders;
        const _res = await models_1.Bot.findByIdAndDelete(id).exec();
        for (let oid of orders) {
            console.log(oid);
            const order = await models_1.Order.findById(oid);
            if (order) {
                console.log(`DELETING ORDER ` + oid);
                await models_1.Order.findByIdAndRemove(oid).exec();
                console.log("Order deleted");
            }
        }
        return res.send("BOT DELETED");
    }
    catch (error) {
        console.log(error);
        return (0, functions_1.tunedErr)(res, 500, "Failed to delete bot");
    }
});
exports.default = router;
//# sourceMappingURL=bots.js.map