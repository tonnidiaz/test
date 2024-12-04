import { User, Bot, TriArbitOrder, TuOrder } from "@cmn/models";
import type { IBot } from "@cmn/models/bot";
import { handleErrs } from "@cmn/utils/functions";
import { createChildBots } from "@cmn/utils/functions/bots-funcs.js";
import { error, json } from "@sveltejs/kit";

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

export const GET = async ({request: req, url}) =>{
    try {
        const  query = Object.fromEntries(url.searchParams);
        const username = query.user;

        const user = username ? await User.findOne({ username }).exec() : null;
        //console.log(user);
        if (username && !user) return error(404, "Bots not found");
        const bots = user
            ? await Bot.find({ user: user.id }).exec()
            : await Bot.find().exec();
        return json(
            (
                await Promise.all(
                    bots.map(async (e) => await parseBot(e, false))
                )
            ).reverse()
        );
    } catch (error) {
        handleErrs(error);
        return error(500, "Something went wrong")
    }
}

