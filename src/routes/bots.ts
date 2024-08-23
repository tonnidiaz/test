import { authMid } from "@/middleware/auth.mid";
import { Bot, Order, User } from "@/models";
import { IBot } from "@/models/bot";
import { botJobSpecs, jobs} from "@/utils/constants";
import { addBotJob } from "@/utils/orders/funcs";
import { botLog, getPricePrecision, toFixed, tunedErr } from "@/utils/functions";
import { IObj } from "@/utils/interfaces";
import express from "express";
import schedule from "node-schedule";
import { wsOkx } from "@/classes/main-okx";
import { wsBybit } from "@/classes/main-bybit";
import { getAmtToBuyWith } from "@/utils/funcs2";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const { query } = req;
        const username = query.user;

        const user = username ? await User.findOne({ username }).exec() : null;
        //console.log(user);
        if (username && !user) return tunedErr(res, 404, "Bot not found");
        const bots = user
            ? await Bot.find({ user: user.id }).exec()
            : await Bot.find().exec();
        res.json(bots.map((e) => e.toJSON()).reverse());
    } catch (error) {
        return tunedErr(res, 500, "Failed to get bots");
    }
});

router.post("/create", authMid, async (req, res) => {
    try {
        const body = req.body;
        const bot = new Bot();
        for (let k of Object.keys(body)) {
            bot.set(k, body[k]);
        }
        
        [bot.base, bot.ccy] = body.pair ?? body.symbol;
        const user = await User.findOne({ username: body.user }).exec();
        if (!user) return tunedErr(res, 400, "User account not available");
        bot.user = user.id;

        const total_quote = { base: bot.base, ccy: bot.ccy, amt: bot.start_bal };
        bot.total_quote.push(total_quote);

       const aside = { base: bot.base, ccy: bot.ccy, amt: 0 };
        bot.aside.push(aside);

        bot.start_bal = bot.start_amt
        await bot.save();
        user.bots.push(bot.id);
        await user.save();
        res.json(bot.toJSON());
    } catch (error) {
        console.log(error);
        return tunedErr(res, 500, "Failed to create bot");
    }
});

const calcCurrAmt = async (bot: IBot)=>{
    const order = await Order.findById(bot.orders[bot.orders.length -1]).exec()
    let amt = order?.is_closed ? getAmtToBuyWith(bot, order) : order?.ccy_amt
    const pxPr = getPricePrecision([bot.base, bot.ccy], bot.platform)

    return toFixed(amt ?? 0, pxPr ?? 2)

}

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        let bot = await Bot.findById(id).exec();
        if (!bot) return tunedErr(res, 404, "Bot not found");

        bot = await bot.populate("orders");

        res.json({ ...bot.toJSON(), curr_amt: await calcCurrAmt(bot) });
    } catch (error) {
        console.log(error);
        return tunedErr(res, 500, "Failed to get bot");
    }
});

router.post("/:id/clear-orders", authMid, async (req, res) => {
    const { id } = req.params;
    let bot = await Bot.findById(id).exec();
    if (!bot) return tunedErr(res, 404, "Bot not found");
    console.log(bot.orders.length);
    for (let oid of bot.orders) {
        console.log(oid);
        const order = await Order.findById(oid);
        if (order) {
            console.log(`DELETING ORDER ` + oid);
            await Order.findByIdAndRemove(oid).exec();
            console.log("Order deleted");
        }
        bot.orders = bot?.orders.filter((el) => el != oid);
        await bot.save();
    }

    bot = await bot.populate("orders");

    res.json({ ...bot.toJSON(), curr_amt: await calcCurrAmt(bot) });
});

router.post("/:id/edit", authMid, async (req, res) => {
    try {
        const { id } = req.params;

        const bot = await Bot.findById(id).exec();
        if (!bot) return tunedErr(res, 404, "Bot not found");

        const fd = req.body;
        const { key, val } = fd;
        const jobId = `${bot._id}`;
        const bool = jobs.find((el) => el.id == jobId);
        botLog(bot, "UNSUB TO PREV SYMBOL TICKERS...");

        const ws = bot.platform == 'bybit' ? wsBybit : wsOkx
        await ws.rmvBot(bot.id)
        if (key == "active") {
            if (bool && !val) {
                // Deactivate JOB
                //schedule.cancelJob(bool.job);
                bool.job.cancel();
                const jobIndex = jobs.findIndex((el) => el.id == jobId);
                jobs[jobIndex] = { ...bool, active: false };
                botLog(bot, `Job ${bool.id} cancelled`);
            } else if (val) {
                console.log("Resuming JOB...");
                if (!bool) await addBotJob(bot as any);
                else {
                    const r = bool.job.reschedule(botJobSpecs(bot.interval)); //schedule.rescheduleJob(bool.job, botJobSpecs);
                    if (!r) {
                        botLog(bot, "FAILED TO RESUME JOB");
                    }
                    const jobIndex = jobs.findIndex((el) => el.id == jobId);
                    jobs[jobIndex] = { ...bool, active: true };
                }
            }
            bot.set(key, val);

            botLog(bot, "DONE ADDING/PAUSING JOB");
        } else if (key == "multi") {
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
                    const r = bool.job.reschedule(botJobSpecs(bot.interval)); //schedule.rescheduleJob(bool.job, botJobSpecs);
                    if (!r) {
                        botLog(bot, "FAILED TO RESUME JOB");
                    }
                    const jobIndex = jobs.findIndex((el) => el.id == jobId);
                    jobs[jobIndex] = { ...bool, active: true };
                }
            }
            botLog(bot, "RE-SUB TO TICKERS...");
            
            if (bot.orders.length){
                const order = await Order.findById(bot.orders[bot.orders.length - 1]).exec()
                if (order && order.side == 'sell' && !order.is_closed && order.sell_price != 0){
                  await ws.addBot(bot.id, true)  
                }
            }
            
        }
        else{
            //await ws.rmvBot(bot.id)
        }

        res.json({...(await bot.populate("orders")).toJSON() , curr_amt: await calcCurrAmt(bot)});
    } catch (error) {
        console.log(error);
        return tunedErr(res, 500, "Failed to edit bot");
    }
});
router.post("/:id/delete", authMid, async (req, res) => {
    try {
        const { id } = req.params;
        const bot = await Bot.findById(id).exec();
        if (!bot) return tunedErr(res, 400, "BOT NOT FOUND");
        const orders = bot.orders;
        const _res = await Bot.findByIdAndDelete(id).exec();

        for (let oid of orders) {
            console.log(oid);
            const order = await Order.findById(oid);
            if (order) {
                console.log(`DELETING ORDER ` + oid);
                await Order.findByIdAndRemove(oid).exec();
                console.log("Order deleted");
            }
        }
        return res.send("BOT DELETED");
    } catch (error) {
        console.log(error);
        return tunedErr(res, 500, "Failed to delete bot");
    }
});

export default router;
