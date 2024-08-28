import { Bot } from "@/models";
import { IBot } from "@/models/bot";
import { botLog } from "../functions";

export const createChildBots = async (bot: IBot) => {
    botLog(bot, "CREATING CHILD BOTS...");
    if (bot.arbit_orders.length)
        return botLog(
            bot,
            "CANNOT MODIFY CHILD BOTS WHILE ORDER STILL HAS ORDERS"
        );
    if (bot.arbitrage_type == "tri") {
        for (let child of bot.children) {
            botLog(bot, "DELETING CHILD", child);
            const c = await Bot.findByIdAndRemove(child);
            botLog(bot, "CHILD", c?.name, "DELETED");
        }
        bot.children = [];
        const pairA = [bot.B, bot.A],
            pairB = [bot.C, bot.B],
            pairC = [bot.C, bot.A];

        const botA = new Bot({
            name: bot.name + " [A]",
            base: pairA[0],
            ccy: pairA[1],
            start_amt: bot.start_amt,
            start_bal: bot.start_bal,
            strategy: bot.strategy,
            interval: bot.interval,
            platform: bot.platform,
            user: bot.user,
            category: bot.category,
            demo: bot.demo,
            active: false,
            is_child: true,
            parent: bot.id,
        });

        await botA.save();
        bot.children.push(botA.id);

        const botB = new Bot({
            name: bot.name + " [B]",
            base: pairB[0],
            ccy: pairB[1],
            start_amt: bot.start_amt,
            start_bal: bot.start_bal,
            strategy: bot.strategy,
            interval: bot.interval,
            platform: bot.platform,
            user: bot.user,
            category: bot.category,
            demo: bot.demo,
            active: false,
            is_child: true,
            parent: bot.id,
        });

        await botB.save();
        bot.children.push(botB.id);

        const botC = new Bot({
            name: bot.name + " [C]",
            base: pairC[0],
            ccy: pairC[1],
            start_amt: bot.start_amt,
            start_bal: bot.start_bal,
            strategy: bot.strategy,
            interval: bot.interval,
            platform: bot.platform,
            user: bot.user,
            category: bot.category,
            demo: bot.demo,
            active: false,
            is_child: true,
            parent: bot.id,
        });

        await botC.save();
        bot.children.push(botC.id);
    }
    await bot.save();
};
