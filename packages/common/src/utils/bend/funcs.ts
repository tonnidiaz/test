import { Bot, TriArbitOrder, TuOrder } from "@cmn/models";
import { IBot } from "@cmn/models/bot";
import { handleErrs } from "../functions";
import { botLog } from "./functions";

export const parseBot = async (bot: IBot, deep = true) => {
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

export const clearOrders = async (bot: IBot) => {
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
        botLog(bot, "FAILED TO CLEAR ORDERS");
        handleErrs(e)
    }
};