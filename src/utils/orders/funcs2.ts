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

export const afterOrderUpdate = async ({ bot }: { bot: IBot }) => {
    const plat =  new OKX(bot)
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

    const order = orders.length ? orders[orders.length - 1] : null;
    const isClosed = order?.is_closed;

    /* ------ START ---------- */
    if ((isClosed || !order) && true /* buyCond */) {
        // Place buy order
        console.log(`[ ${bot.name} ]\tHAS BUY SIGNAL > GOING IN`);

        const amt = order
            ? order.new_ccy_amt - Math.abs(order.sell_fee)
            : bot.start_amt;

        const entryLimit = 0; //calcEntryPrice(row, "buy");
        botLog(bot, {
            entryLimit,
        });

        const ts = new Date();
        const res = await placeTrade({
            bot: bot,
            ts: parseDate(ts),
            amt,
            side: "buy",
            price: entryLimit,
            plat: plat,
        });

        if (res) {
            botLog(bot, "WAITING FOR NEXT ROUND!");
        }
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
