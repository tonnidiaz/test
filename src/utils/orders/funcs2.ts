import { IOrder } from "@/models/order";
import {
    calcEntryPrice,
    calcSL,
    calcTP,
    chandelierExit,
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
import { isStopOrder } from "../constants";

export const afterOrderUpdate = async ({ bot }: { bot: IBot }) => {
    const plat = bot.platform == "okx" ? new OKX(bot) : new Bybit(bot);

    const klines = await plat.getKlines({
        end: Date.now() - bot.interval * 60 * 1000,
    });

    if (!klines) return console.log("FAILED TO GET KLINES");
    console.log(`\n[${bot.name}]\tCHECKING SIGNALS...\n`);

    const df = chandelierExit(
        heikinAshi(parseKlines(klines), [bot.base, bot.ccy])
    );
    const row = df[df.length - 1];
    botLog(bot, 'CANDLE');
    console.log(row);
    const ts = new Date(
        Date.parse(row.ts) + bot.interval * 60 * 1000
    ).toISOString();

    const strategy = objStrategies[bot.strategy - 1];
    botLog(bot, "STRATEGY:");
    console.log(strategy);
    const orders = await Order.find({
        bot: bot._id,
        base: bot.base,
        ccy: bot.ccy,
    }).exec();
    
    const order = orders.length ? orders[orders.length - 1] : null;
    const isClosed = order?.is_closed;

    /* ------ START ---------- */
    if ((isClosed || !order) && strategy.buyCond(row)) {
        // Place buy order
        console.log(`[ ${bot.name} ]\tHAS BUY SIGNAL > GOING IN`);

        const amt = order
            ? order.new_ccy_amt - Math.abs(order.sell_fee)
            : bot.start_amt;

        const entryLimit = calcEntryPrice(row, "buy");
        console.log({
            c: row.c,
            o: row.o,
            entryLimit,
        });
        const res = await placeTrade({
            bot: bot,
            ts: parseDate(ts),
            amt,
            side: "buy",
            price: entryLimit,
            plat: plat,
        });
    } else if (!isClosed && order?.side == "sell" && order?.order_id == "") {
        botLog(bot, 'CHECK TO SEE IF CAN PLACE ORDER...')
        if (isStopOrder || strategy.sellCond(row)) {
            /**
             * Place sell order
             */
            const exitLimit = calcTP(row, order.buy_price);
            const sl = calcSL(order.buy_price);
            console.log({
                c: row.c,
                o: row.o,
                entry: order.buy_price,
                exitLimit,
                sl,
            });

            if (order) {
                console.log(`[ ${bot.name} ]\tHAS SELL SIGNAL > GOING OUT`);
                const amt = order.base_amt - order.buy_fee;
                const res = await placeTrade({
                    bot: bot,
                    ts: parseDate(ts),
                    amt: Number(amt),
                    side: "sell",
                    price: exitLimit,
                    plat: plat,
                    sl,
                });
            }
        }
    }
    /* ------ START ---------- */
};
