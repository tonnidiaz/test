/**
 * WORKS BEST WITH THE 5min TIMEFRAME ON BYBIT
 */

import { IBot } from "@/models/bot";
import { IOrder } from "@/models/order";
import {
    getAmtToBuyWith,
    getBaseToSell,
    getBotPlat,
    getBotStrategy,
} from "@/utils/funcs2";
import { botLog, ceil, toFixed } from "@/utils/functions";
import { ICandle } from "@/utils/interfaces";
import { placeTrade } from "../funcs";
import { Order } from "@/models";

export const prodStrategy = async ({
    pos,
    order,
    bot,
    row,
    prevrow,
    pxPr,
    basePr,
}: {
    order?: IOrder | null;
    bot: IBot;
    pos: boolean;
    row: ICandle;
    prevrow: ICandle;
    pxPr: number;
    basePr: number;
}) => {
    botLog(bot, prodStrategy);

    const plat = getBotPlat(bot);
    const str = getBotStrategy(bot);
    botLog(bot, { str });

    const { ts, o, h, l, c } = row;
    const isGreen = prevrow.c >= prevrow.o;
    let entry = 0;

    if (!pos && str.buyCond(prevrow)) {
        botLog(bot, "KAYA RA BUY");

        const amt = getAmtToBuyWith(bot, order);
        entry = o;

        const r = await placeTrade({
            bot: bot,
            ts,
            amt,
            side: "buy",
            price: entry,
            plat: plat,
            ordType: "Market",
        });

        if (!r) {
            return botLog(bot, "FAILED TO PLACE BUY ORDER");
        }

        order = (await Order.findById(r).exec())!;
        pos = true;
    }

    if (order && pos && entry) {
        let exitLimit = 0;

        const e = Math.max(prevrow.o, prevrow.c);
        const T = 2.5;
        exitLimit = e * (1 + T / 100);
        let exit = 0;

        exit = exitLimit;
        const amt = toFixed(getBaseToSell(order), basePr);

        botLog(bot, { exit, base: amt });

        if (exit != 0) {
            botLog(bot, "PLACING LIMIT SELL AT EXIT_LIMIT");

            const r = await placeTrade({
                bot: bot,
                ts,
                amt: Number(amt),
                side: "sell",
                plat: plat,
                price: exit,
                ordType: "Limit",
            });

            if (!r) {
                return botLog(bot, "COULD NOT PLACE SELL ORDER");
            }
            botLog(bot, "SELL ORDER PLACED");
        }
    }
};
/* 
export const prodStrategy = async ({pos, order, bot}: {order?: IOrder | null, bot: IBot, pos: boolean, row: ICandle, prevrow: ICandle}) =>{
    botLog(bot, prodStrategy)
}
 */
