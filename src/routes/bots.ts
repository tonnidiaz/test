import { authMid } from "@/middleware/auth.mid";
import { Bot, Order, User } from "@/models";
import { IBot } from "@/models/bot";
import { botJobSpecs, jobs } from "@/utils/constants";
import { addBotJob } from "@/utils/orders/funcs";
import {
    botLog,
    getPricePrecision,
    toFixed,
    tunedErr,
} from "@/utils/functions";
import { IObj } from "@/utils/interfaces";
import express from "express";
import schedule from "node-schedule";
import { wsOkx } from "@/classes/main-okx";
import { wsBybit } from "@/classes/main-bybit";
import { getAmtToBuyWith, parseDate } from "@/utils/funcs2";
import { IOrder } from "@/models/order";
import { createChildBots } from "@/utils/functions/bots-funcs";
import mongoose from "mongoose";

const router = express.Router();

const parseBot = async (bot: IBot, deep = true) => {
    bot = await bot.populate("orders");
    try {
        if (deep){
          for (let i = 0; i < bot.arbit_orders.length; i++)
        {
            bot = await bot.populate(`arbit_orders.${i}.a`)
            bot = await bot.populate(`arbit_orders.${i}.b`)
            bot = await bot.populate(`arbit_orders.${i}.c`)
        }  
        }
       
    } catch (e) {
        console.log(e);
    }

    return { ...bot.toJSON(), orders: bot.type == 'arbitrage' ? bot.arbit_orders : bot.orders };
};

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
        res.json(
            (
                await Promise.all(
                    bots.map(async (e) => await parseBot(e, false))
                )
            ).reverse()
        );
    } catch (error) {
        console.log(error);
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

        const is_arb = bot.type == "arbitrage";

        const pair: string[] = is_arb
            ? [bot.B, bot.A]
            : body.pair ?? body.symbol;

        [bot.base, bot.ccy] = pair;

        const user = await User.findOne({ username: body.user }).exec();
        if (!user) return tunedErr(res, 400, "User account not available");
        bot.user = user.id;

        const total_quote = {
            base: bot.base,
            ccy: bot.ccy,
            amt: bot.start_bal,
        };
        bot.total_quote.push(total_quote);

        const aside = { base: bot.base, ccy: bot.ccy, amt: 0 };
        bot.aside.push(aside);

        bot.start_bal = bot.start_amt;

        if (is_arb) {
            await createChildBots(bot);
        }
        await bot.save();
        user.bots.push(bot.id);
        await user.save();
        res.json(bot.toJSON());
    } catch (error) {
        console.log(error);
        return tunedErr(res, 500, "Failed to create bot");
    }
});

const calcCurrAmt = async (bot: IBot) => {
    const lastOrderId =
        bot.type == "normal"
            ? bot.orders[bot.orders.length - 1]
            : bot.arbit_orders[bot.arbit_orders.length - 1]?.c;
    const order = await Order.findById(lastOrderId).exec();
    let amt = getAmtToBuyWith(bot, order);
    const pxPr = getPricePrecision([bot.base, bot.ccy], bot.platform);

    return toFixed(amt ?? 0, pxPr ?? 2);
};

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        let bot = await Bot.findById(id).exec();
        if (!bot) return tunedErr(res, 404, "Bot not found");

        const _bot = await parseBot(bot);

        res.json({ ..._bot, curr_amt: await calcCurrAmt(bot) });
    } catch (error) {
        console.log(error);
        return tunedErr(res, 500, "Failed to get bot");
    }
});

router.post("/:id/clear-orders", authMid, async (req, res) => {
    const { id } = req.params;
    let bot = await Bot.findById(id).exec();
    if (!bot) return tunedErr(res, 404, "Bot not found");
    if (bot.is_child)
        return tunedErr(
            res,
            400,
            "CHILD BOT ORDERS CAN NOT BE INDIVIDUALLY CLEARD"
        );

    console.log(bot.orders.length);
    for (let oid of bot.orders) {
        console.log(oid);
        console.log(`DELETING ORDER ` + oid);
        await Order.findByIdAndDelete(oid).exec();
        console.log("Order deleted");
        bot.orders = bot?.orders.filter((el) => el != oid);
        await bot.save();
    }

    for (let oid of bot.children) {
        const child = await Bot.findById(oid).exec();
        if (!child) continue;
        // DELETE CHILD BOT ORDERS
        for (let oid of child.orders) {
            console.log(`DELETING CHILD BOT ORDER ` + oid);
            await Order.findByIdAndDelete(oid).exec();
            console.log("CHILD BOT ORDER deleted");
            child.orders = child?.orders.filter((el) => el != oid);
            await child.save();
        }
        child.set('orders', [])
        await child.save()
    }
    bot.set("orders", []);
    bot.set("arbit_orders", []);

    await bot.save();

    const _bot = await parseBot(bot);

    res.json({ ..._bot, curr_amt: await calcCurrAmt(bot) });
});

router.post("/:id/edit", authMid, async (req, res) => {
    try {
        const { id } = req.params;

        let bot = await Bot.findById(id).exec();
        if (!bot) return tunedErr(res, 404, "Bot not found");
        if (bot.is_child)
            return tunedErr(
                res,
                400,
                "CHILD BOTS CAN NOT BE INDIVIDUALLY MODIFIED"
            );

        const { A: oldA, B: oldB, C: oldC } = bot;

        const fd = req.body;
        const { key, val } = fd;
        //botLog(bot, "EDIT BOT:", {key, val})
        const jobId = `${bot._id}`;
        const bool = jobs.find((el) => el.id == jobId);
        botLog(bot, "UNSUB TO PREV SYMBOL TICKERS...");

        const ws = bot.platform == "bybit" ? wsBybit : wsOkx;
        await ws.rmvBot(bot.id);

        const ts = parseDate(new Date());

        const is_arb = bot.type == "arbitrage";

        const commonFields = [
            "platform",
            "interval",
            "name",
            "demo",
            "category",
            "start_amt",
            "start_bal",
            "A",
            "B",
            "C",
        ];

        if (key == "active") {
            if (bool && !val) {
                // Deactivate JOB
                //schedule.cancelJob(bool.job);
                bool.job.cancel();
                const jobIndex = jobs.findIndex((el) => el.id == jobId);
                jobs[jobIndex] = { ...bool, active: false };
                botLog(bot, `Job ${bool.id} cancelled`);
                bot.deactivated_at = ts;

                for (let oid of bot.children) {
                    const child = await Bot.findById(oid).exec();
                    if (!child) continue;
                    child.deactivated_at = ts;
                    await child.save();
                }
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
                bot.activated_at = ts;
                bot.deactivated_at = undefined;

                for (let oid of bot.children) {
                    const child = await Bot.findById(oid).exec();
                    if (!child) continue;
                    child.activated_at = ts;
                    child.deactivated_at = undefined;
                    await child.save();
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
                    continue
                }
                
                bot.set(k, v);
                if (commonFields.includes(k)) {
                    const childA = await Bot.findById(bot.children[0]).exec();
                    const childB = await Bot.findById(bot.children[1]).exec();
                    const childC = await Bot.findById(bot.children[2]).exec();

                    if (!childA || !childB || !childC) {
                        bot.active = false;
                        await bot.save();

                        botLog(bot, "ONE OF THE CHILD BOTS NOT FOUND");
                        return tunedErr(
                            res,
                            400,
                            "ONE OF THE CHILD BOTS NOT FOUND"
                        );
                    }
                    const children = [childA, childB, childC];
                    if (k == "name" || k == "A" || k == "B" || k == "C") {
                    } else {
                        for (let b of children) {
                            b!.set(k, v);
                        }
                    }
                    for (let b of children) {
                        await b.save();
                    }
                }
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

            if (bot.orders.length) {
                const order = await Order.findById(
                    bot.orders[bot.orders.length - 1]
                ).exec();
                if (
                    order &&
                    order.side == "sell" &&
                    !order.is_closed &&
                    order.sell_price != 0
                ) {
                    await ws.addBot(bot.id, true);
                }
            }
        } else {
            //await ws.rmvBot(bot.id)
        }

        const pair: string[] = is_arb ? [bot.B, bot.A] : [bot.base, bot.ccy];

        [bot.base, bot.ccy] = pair;
        //TODO: COMMENT OUT
        const { A, B, C } = bot;
        botLog(bot, { oldA, oldB, oldC });
        botLog(bot, { A, B, C });
        if (is_arb) {
            if (oldA != A || oldB != B || oldC != C) {
                await createChildBots(bot);
            }
        }

        await bot.save();
        //botLog(bot, bot.toJSON())

        const _bot = await parseBot(bot);
        res.json({
            ..._bot,
            curr_amt: await calcCurrAmt(bot),
        });
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
        if (bot.is_child)
            return tunedErr(
                res,
                400,
                "CHILD BOTS CAN NOT BE INDIVIDUALLY DELETED"
            );

        const { children, orders } = bot;
        const _res = await Bot.findByIdAndDelete(id).exec();

        for (let oid of orders) {
            console.log(`DELETING ORDER ` + oid);
            await Order.findByIdAndDelete(oid).exec();
            console.log("Order deleted");
        }
        for (let oid of children) {
            const child = await Bot.findById(oid).exec();
            if (!child) continue;

            console.log(`DELETING CHILD BOT ` + oid);
            await Bot.findByIdAndDelete(oid).exec();
            console.log("CHILD BOT deleted");

            // DELETE CHILD BOT ORDERS
            for (let oid of child.orders) {
                console.log(`DELETING CHILD BOT ORDER ` + oid);
                await Order.findByIdAndDelete(oid).exec();
                console.log("CHILD BOT ORDER deleted");
            }
        }
        const bots = await Bot.find().exec();
        res.json(
            (
                await Promise.all(
                    bots.map(async (e) => await parseBot(e, false))
                )
            ).reverse()
        );
    } catch (error) {
        console.log(error);
        return tunedErr(res, 500, "Failed to delete bot");
    }
});

export default router;
