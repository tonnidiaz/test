import { IOrder } from "@/models/order";
import {
    calcEntryPrice,
    calcSL,
    calcTP,
    chandelierExit,
    findBotOrders,
    heikinAshi,
    parseDate,
    parseKlines,
} from "../funcs2";
import { IBot } from "@/models/bot";
import { Order } from "@/models";
import { placeTrade } from "./funcs";
import { OKX } from "@/classes/okx";
import { Bybit } from "@/classes/bybit";
import { botLog } from "../functions";
import { objStrategies } from "@/strategies";
import { trueRange } from "indicatorts";
import { IObj } from "../interfaces";

export const afterOrderUpdate = async ({
    bot,
    prevRow,
    isGreen,
}: {
    bot: IBot;
    prevRow: IObj;
    isGreen: boolean;
}) => {
    const plat = new OKX(bot);
    botLog(bot, "SIM: GETTING KLINES...");
    /* const klines = await plat.getKlines({
        end: Date.now() - bot.interval * 60 * 1000,
    });

    if (!klines) return console.log("FAILED TO GET KLINES");

    const df = chandelierExit(
        heikinAshi(parseKlines(klines), [bot.base, bot.ccy])
    );
    const row = df[df.length - 1];
    botLog(bot, "CANDLE");
    console.log(row);
    const ts = new Date(
        Date.parse(row.ts) + bot.interval * 60 * 1000
    ).toISOString(); */

    const strategy = objStrategies[bot.strategy - 1];
    botLog(bot, strategy);
    const orders = await findBotOrders(bot);

    let order = orders.length ? orders[orders.length - 1] : null;

    const pos = order && order.side == "sell";
    console.log({ pos });

    /* ------ START ---------- */
    if (!pos && strategy.buyCond(prevRow)) {
        // Place buy order
        botLog(bot, "BUY ORDER NOT YET PLACED, UPDATING ENTRY_LIMIT");

        const entryLimit = prevRow.ha_c;
        botLog(bot, {
            entryLimit,
        });

        const ts = new Date();

        /* CREATE NEW ORDER */
        if (!order) {
            order = new Order({
                buy_price: entryLimit,

                side: "buy",
                bot: bot.id,
                base: bot.base,
                ccy: bot.ccy,
            });
            bot.orders.push(order.id)

            await bot.save()
        }
        /* ENTER_TS */
        order.buy_timestamp = { i: parseDate(ts) };
        order.buy_price = entryLimit;

        await order.save();
        botLog(bot, `ENTRY_LIMIT UPDATED to ${entryLimit}`);
    } else if (pos && order && !order.is_closed && strategy.sellCond(prevRow)) {
        botLog(bot, "ORDER NOT YET CLOSED, UPDATING EXIT_LIMIT");

        const exitLimit = prevRow.ha_c;
        order.sell_timestamp = { i: parseDate(new Date()) };
        order.buy_price = exitLimit;

        await order.save();
        botLog(bot, `EXIT_LIMIT UPDATED TO: ${exitLimit}`);
    }

};

export const updateOrderInDb = async (order: IOrder, res: any) => {
    const fee = Math.abs(res.fee); // In USDT

    /* Buy/Base fee already removed when placing sell order  */
    order.new_ccy_amt = res.fillSz * res.fillPx;
    order.sell_price = res.fillPx;
    order.is_closed = true;
    order.sell_fee = fee;
    order.sell_timestamp = {
        i: parseDate(new Date(res.cTime)),
        o: parseDate(new Date(res.fillTime)),
    };
    /* order == currentOrder */
    const bal = order.new_ccy_amt - Math.abs(res.fee);
    const profit = ((bal - order.ccy_amt) / order.ccy_amt) * 100;
    order.profit = profit;
    order.order_id = res.id;
    await order.save();
};
