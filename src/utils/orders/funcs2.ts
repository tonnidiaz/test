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

export const afterOrderUpdate = async ({ bot }: { bot: IBot }) => {
    const plat = bot.platform == "okx" ? new OKX(bot) : new Bybit(bot);
    botLog(bot, "SIM: GETTING KLINES...")
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

        const entryLimit = 0//calcEntryPrice(row, "buy");
        botLog(bot, {
            entryLimit,
        });

        const ts = new Date()
        const res = await placeTrade({
            bot: bot,
            ts: parseDate(ts),
            amt,
            side: "buy",
            price: entryLimit,
            plat: plat,
        });

        if (res) {
            botLog(bot, "PLACING ALGO SELL ORDER...");
            const tp = calcTP(res.buy_price);
            const sl = calcSL(res.buy_price);
            botLog(bot, {
                entry: res.buy_price,
                exitLimit: tp,
                sl,
            });

            const amt = res.base_amt - res.buy_fee;
            await placeTrade({
                bot: bot,
                ts: parseDate(ts),
                amt: Number(amt),
                side: "sell",
                price: tp,
                plat: plat,
                sl,
            });

            botLog(bot, "ALGO ORDER PLACED. WAITING FOR NEXT ROUND!");
        }
    }
};
