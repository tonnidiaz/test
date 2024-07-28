import { IOrder } from "@/models/order";
import {
    calcEntryPrice,
    calcSL,
    calcTP,
    tuCE,
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
import { IObj, IOrderDetails } from "../interfaces";
import { wsOkx } from "@/classes/main-okx";
import { objPlats } from "../consts";
//import { wsOkx } from "@/classes/main-okx";

export const afterOrderUpdate = async ({ bot }: { bot: IBot }) => {
    const plat = new objPlats[bot.platform](bot);

    botLog(bot, "SIM: GETTING KLINES...");
    const klines = await plat.getKlines({});

    if (!klines) return console.log("FAILED TO GET KLINES");

    const df = tuCE(heikinAshi(parseKlines(klines)));

    const row = df[df.length - 1];
    const prevRow = row;
    botLog(bot, "CANDLE");
    console.log(row);

    const strategy = objStrategies[bot.strategy - 1];
    botLog(bot, strategy);
    const orders = await findBotOrders(bot);

    let order = orders.length ? orders[orders.length - 1] : null;

    let pos =
        order &&
        order.side == "sell" &&
        !order.is_closed &&
        order.buy_order_id.length != 0;
    console.log({ pos });

    /* ------ START ---------- */
    if (!pos) {
        // Place buy order
        botLog(bot, "BUY ORDER NOT YET PLACED, UPDATING ENTRY_LIMIT");

        const entryLimit = prevRow.ha_c;
        botLog(bot, {
            entryLimit,
        });

        const ts = new Date();
        /* PLACE MARKET BUY ORDER */
        const amt =
            order && order.buy_order_id.length
                ? order.new_ccy_amt - Math.abs(order.sell_fee)
                : bot.start_amt;

        const res = await placeTrade({
            bot: bot,
            ts: parseDate(ts),
            amt,
            side: "buy",
            price: 0 /* 0 for market buy */,
            plat: plat,
        });
        if (res) {
            botLog(bot, "MARKET BUY ORDER PLACED. TO WS SELL CHECK");
            pos = true;
            order = await Order.findById(res).exec();
        }
        /* CREATE NEW ORDER */
        /* if (!order || order.is_closed) {
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
        // ENTER_TS 
        order.buy_timestamp = { i: parseDate(ts) };
        order.buy_price = entryLimit;

        await order.save();
        botLog(bot, `ENTRY_LIMIT UPDATED to ${entryLimit}`); */
    }

    if (pos && order && !order.is_closed && strategy.buyCond(prevRow)) {
        botLog(bot, "SELL ORDER NOT YET CLOSED, UPDATING EXIT_LIMIT");

        const exitLimit = 1; //Math.min(prevRow.ha_c, prevRow.ha_o)//prevRow.ha_h;
        order.sell_timestamp = { i: parseDate(new Date()) };
        if (order.sell_price == 0) {
            order.sell_price = exitLimit;

            botLog(bot, `EXIT_LIMIT UPDATED TO: ${exitLimit}`);
        }

        botLog(bot, "CLEARING BOT HIGHS...");
        order.highs = [];
        await order.save();
        botLog(bot, "WATCHING FOR THE PX CHANGES");
        await wsOkx.addBot(bot.id, true);
    }
};

export const updateOrderInDb = async (order: IOrder, res: IOrderDetails) => {
    const fee = Math.abs(res.fee); // In USDT

    /* Buy/Base fee already removed when placing sell order  */
    order.new_ccy_amt = res.fillSz * res.fillPx;
    order.sell_price = res.fillPx;
    order.is_closed = true;
    order.sell_fee = fee;
    order.sell_timestamp = {
        ...order.sell_timestamp,
        o: parseDate(new Date(res.fillTime)),
    };
    /* order == currentOrder */
    const bal = order.new_ccy_amt - Math.abs(res.fee);
    const profit = ((bal - order.ccy_amt) / order.ccy_amt) * 100;
    order.profit = profit;
    order.order_id = res.id;
    await order.save();
};
