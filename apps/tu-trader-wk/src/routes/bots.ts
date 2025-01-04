
import { authMid } from "@/middleware/auth.mid";
import { addBotToArbitWs, tunedErr } from "@/utils/funcs";
import { superMegaBots, TuMegaWs } from "@cmn/classes/tu-mega-ws";
import { triArbitWsList, crossArbitWsList } from "@cmn/classes/tu-ws";
import { Bot } from "@cmn/models";
import { IBot } from "@cmn/models/bot";
import { clearOrders, parseBot } from "@cmn/utils/bend/funcs";
import { botLog } from "@cmn/utils/bend/functions";
import { jobs, botJobSpecs } from "@cmn/utils/constants";
import { handleErrs, parseDate, timedLog } from "@cmn/utils/functions";
import { createChildBots } from "@cmn/utils/functions/bots-funcs";
import { addBotJob } from "@cmn/utils/orders/funcs";
import express, {type Response} from "express"

const router = express.Router();

export const toggleMegaBot = async (bot: IBot, side: 'activate' | 'deactivate', res?: Response) =>{
    let megaBot = superMegaBots.find(el=> el.bot._id == bot._id)
        
        if (!megaBot)
            {
                megaBot = new TuMegaWs({bot})
                superMegaBots.push(megaBot)
    }
        bot.set("active", side == "activate")
        

        if (side == "activate")
            bot.activated_at = parseDate()
        else
            bot.deactivated_at = parseDate()
        

        megaBot.bot = bot;
        await bot.save()
        const r = await megaBot.subUnsub(bot.active ? 'sub' : 'unsub')
        timedLog("Done", {r})
        if (!r) return !res ? undefined : tunedErr(res, 500, "Failed to activate/deactivate bot")
}
router.post("/:id/toggle-mega-bot", authMid, async (req, res)=>{
    try {
        const {side} = req.query;
        const bot = await Bot.findById(req.params.id).exec()
        if (!bot) return tunedErr(res,400, "Bot not found")
            
        const r = await toggleMegaBot(bot, side as any, res)
        if (r === null) return r;
        
        res.json(await parseBot(bot))
    
    } catch (err) {
        handleErrs(err)
        return tunedErr(res, 500, "Failed to toggle megabot")
    }
})

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

        const { A: oldA, B: oldB, C: oldC, balance: oldBal } = bot;

        const fd = req.body;
        const { key, val } = fd;
        //botLog(bot, "EDIT BOT:", {key, val})
        const jobId = `${bot._id}`;
        const bool = jobs.find((el) => el.id == jobId);
        botLog(bot, "UNSUB TO PREV SYMBOL TICKERS...");
        await rmvBotFromArbitWs(bot)

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
            "balance",
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
                // if (k == 'start_amt' || k == 'start_bal') continue
                if (k == "pair" || k == "symbol") {
                    bot.set("base", v[0]);
                    bot.set("ccy", v[1]);
                    continue;
                }

                bot.set(k, v);

                const updateBal = bot.balance != oldBal;
                if (k == "balance" && updateBal) {
                    bot.set("balCcy", bot.ccy);
                }
                if (bot.type == 'arbitrage' && !bot.arbit_settings.super_mega)
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
                    childA.name = `${bot.name} [A]`;
                    childB.name = `${bot.name} [B]`;
                    childC.name = `${bot.name} [C]`;

                    childA.base = bot.B;
                    childA.ccy = bot.A;

                    childB.base = bot.C;
                    childB.ccy = bot.B;

                    childC.base = bot.C;
                    childC.ccy = bot.A;

                    if (k == "name" || k == "A" || k == "B" || k == "C") {
                    } else {
                        for (let b of children) {
                            if (k == "balance" && updateBal) {
                                b.set(k, v);
                                b.set("balCcy", bot.ccy);
                            } else b!.set(k, v);
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
            await addBotToArbitWs(bot)

            // if (bot.orders.length) {
            //     const order = await Order.findById(
            //         bot.orders[bot.orders.length - 1]
            //     ).exec();
            //     if (
            //         order &&
            //         order.side == "sell" &&
            //         !order.is_closed &&
            //         order.sell_price != 0
            //     ) {
            //         //await ws.addBot(bot.id, true);
            //     }
            // }
        } else {
            //await ws.rmvBot(bot.id)
        }

        const pair: string[] = is_arb ? [bot.B, bot.A] : [bot.base, bot.ccy];

        [bot.base, bot.ccy] = pair;
        //TODO: COMMENT OUT
        const { A, B, C } = bot;
        botLog(bot, { oldA, oldB, oldC });
        botLog(bot, { A, B, C });
        if (is_arb) {await bot.save()
            if (oldA != A || oldB != B || oldC != C) {
                await createChildBots(bot);
            }
        }

        await bot.save();
        //botLog(bot, bot.toJSON())

        const _bot = await parseBot(bot);
        res.json({
            ..._bot,
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

        const { children } = bot;
        const _res = await Bot.findByIdAndDelete(id).exec();

        await clearOrders(bot);
        for (let oid of children) {
            console.log(`DELETING CHILD BOT ` + oid);
            const childBot = await Bot.findById(oid).exec();
            if (childBot) {
                // DELETE IT'S CHILDREN IF ANY
                await clearOrders(childBot);
                await Bot.findOneAndDelete({ parent: childBot.id }).exec();
            }
            await Bot.findByIdAndDelete(oid).exec();
            console.log("CHILD BOT deleted");
        }
        await rmvBotFromArbitWs(bot);

        const bots = await Bot.find().exec();
        res.json(
            (
                await Promise.all(
                    bots.map(async (e) => await parseBot(e, false))
                )
            ).reverse()
        );
    } catch (error) {
        handleErrs(error);
        return tunedErr(res, 500, "Failed to delete bot");
    }
});

const rmvBotFromArbitWs = async (bot: IBot) => {
    const { arbit_settings: settings } = bot;
    if (bot.type == "arbitrage" ) {
        botLog(bot, "Removng bot from ArbitWs...")
        if (settings?._type == "tri")
            await triArbitWsList[bot.platform].rmvBot(bot.id);
        else {
            await crossArbitWsList[bot.platA].rmvBot(bot.id);
            await crossArbitWsList[bot.platB].rmvBot(bot.id);
        }
    }
};



export default router;
