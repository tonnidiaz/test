import { Bot, TriArbitOrder } from "@cmn/models";
import { IBot } from "@cmn/models/bot";
import { botLog } from "../functions";

export const createChildBots = async (bot: IBot) => {
    botLog(bot, "CREATING CHILD BOTS...");
    const arbitOrders = await TriArbitOrder.find({ bot: bot.id }).exec();
    if (arbitOrders.length)
        return botLog(
            bot,
            "CANNOT MODIFY CHILD BOTS WHILE ORDER STILL HAS ORDERS"
        );
    if (bot.arbit_settings?._type == "tri") {
        for (let child of bot.children) {
            botLog(bot, "DELETING CHILD", child);
            const c = await Bot.findByIdAndDelete(child).exec();
            botLog(bot, "CHILD", child, "DELETED");
        }
        bot.children = [];
        const { arbit_settings: asettings } = bot;

        if (bot.arbit_settings.mega) {
            for (let i = 0; i < bot.child_pairs.length; i++) {
                const childPair = bot.child_pairs[i]

                const childBot = new Bot({
                    name: `${bot.name}__child-#${i + 1}`,
                    base: bot.base,
                    ccy: bot.ccy,
                    start_amt: bot.start_amt,
                    balance: bot.start_amt,
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
                    arbit_settings: {
                        _type: "tri",
                        min_perc: asettings.min_perc,
                    },
                    A: childPair.A,
                    B: childPair.B,
                    C: childPair.C,
                });

                await childBot.save()
                bot.children.push(childBot.id)
                await bot.save()
                await  createChildBots(childBot)
            }
        }
        // call this func for each childPair
        else {
            const pairA = [bot.B, bot.A],
                pairB = [bot.C, bot.B],
                pairC = [bot.C, bot.A];

            const botA = new Bot({
                name: bot.name + " [A]",
                base: pairA[0],
                ccy: pairA[1],
                start_amt: bot.start_amt,
                balance: bot.start_amt,
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
    }
    await bot.save();
};
