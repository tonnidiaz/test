import { tuErr } from "@/lib/server/funcs";
import { crossArbitWsList, triArbitWsList } from "@cmn/classes/tu-ws";
import { Bot, TriArbitOrder, TuOrder } from "@cmn/models";
import type { IBot } from "@cmn/models/bot";
import { botLog } from "@cmn/utils/bend/functions";
import { handleErrs } from "@cmn/utils/functions";
import type { IObj } from "@cmn/utils/interfaces";
import { error, json } from "@sveltejs/kit";

const addBotToArbitWs = async (bot: IBot) => {
    const { arbit_settings: settings } = bot;
    if (bot.type == "arbitrage" && bot.active && settings?.use_ws) {
        botLog(bot, "Adding bot to ArbitWs...")
        if (settings?._type == "tri")
            await triArbitWsList[bot.platform].addBot(bot.id);
        else {
            await crossArbitWsList[bot.platA].addBot(bot.id);
            await crossArbitWsList[bot.platB].addBot(bot.id);
        }
    }
};
const parseBot = async (bot: IBot, deep = true) => {
    //bot = await bot.populate("orders");
    const is_arbit = bot.type == "arbitrage";
    let orders = 0;
    try {
        // if (deep){
        //   for (let i = 0; i < bot.arbit_orders.length; i++)
        // {
        //     bot = await bot.populate(`arbit_orders.${i}.a`)
        //     bot = await bot.populate(`arbit_orders.${i}.b`)
        //     bot = await bot.populate(`arbit_orders.${i}.c`)
        // }
        // }
        if (is_arbit) {
            orders = await TriArbitOrder.countDocuments({ bot: bot.id });
        } else {
            orders = await TuOrder.countDocuments({
                bot: bot.id,
                is_arbit: bot.is_child,
            });
        }
    } catch (e) {
        console.log(e);
    }

    return { ...bot.toJSON(), orders };
};

const clearOrders = async (bot: IBot) => {
    try {
        const r = await TuOrder.deleteMany({ bot: bot.id }).exec();
        const r2 = await TriArbitOrder.deleteMany({ bot: bot.id }).exec();
        for (let childId of bot.children) {
            console.log("DELETING CHILD ORDERS...");
            await TuOrder.deleteMany({ bot: childId }).exec();
            await Bot.findByIdAndUpdate(childId, {
                balance: bot.start_amt,
            }).exec();
        }
        bot.balance = bot.start_amt;
        await bot.save();
        botLog(bot, "ORDERS CLEARED");
    } catch (e) {
        botLog(bot, "FAILED TO CLEAR ORDERS", e);
    }
};

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
export const deleteBot = async ({body, bot}: {body: IObj; bot: IBot})=>{
        const id = bot.id
        if (bot.is_child)
            return tuErr(
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
        return json(
            (
                await Promise.all(
                    bots.map(async (e) => await parseBot(e, false))
                )
            ).reverse()
        );
    
}