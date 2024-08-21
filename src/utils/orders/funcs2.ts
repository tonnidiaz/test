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
    orderHasPos,
    getLastOrder,
} from "../funcs2";
import { IBot } from "@/models/bot";
import { Order } from "@/models";
import { placeTrade } from "./funcs";
import {
    botLog,
    ceil,
    getCoinPrecision,
    getPricePrecision,
    sleep,
    timedLog,
    toFixed,
} from "../functions";
import { objStrategies } from "@/strategies";
import { IObj, IOrderDetails } from "../interfaces";
import { wsOkx } from "@/classes/main-okx";
import { objPlats } from "../consts2";
import { wsBybit } from "@/classes/main-bybit";
import { SL } from "../constants";
import { Bybit } from "@/classes/bybit";
import { prodStrategy as prodStr5 } from "./strategies/def-5";
import { prodStrategy as prodStr60 } from "./strategies/def-60";
import { cloud5Prod } from "./strategies/cloud-5.prod";
//import { wsOkx } from "@/classes/main-okx";

const useDef5 = false,
    useDef60 = true;

export const afterOrderUpdate = async ({ bot }: { bot: IBot }) => {
    const plat = new objPlats[bot.platform](bot);
    await sleep(500)
    botLog(bot, "SIM: GETTING KLINES...");
    const klines = await plat.getKlines({ end: Date.now() });

    if (!klines) return console.log("FAILED TO GET KLINES");

    const df = tuCE(heikinAshi(parseKlines(klines)));

    const pxPr = getPricePrecision([bot.base, bot.ccy], bot.platform);
    const basePr = getCoinPrecision([bot.base, bot.ccy], "limit", bot.platform);

    if (pxPr == null || basePr == null) return;
    const row = df[df.length - 1];
    const prevrow = df[df.length - 2];

    botLog(bot, { prevrow: prevrow.ts, row: row.ts });

    let order = await getLastOrder(bot);
    let pos = orderHasPos(order);

    botLog(bot, { ts: row.ts, o: row.o });

    const params = { row, prevrow, bot, order, pos, pxPr, basePr }
    await cloud5Prod(params)


    // if (useDef5) {
    //     await prodStr5(params);
    // } else if (useDef60) {
    //     await prodStr60({ row, prevrow, bot, order, pos, pxPr, basePr });
    // }
};

export const updateOrderInDb = async (order: IOrder, res: IOrderDetails) => {
    const fee = Math.abs(res.fee); // In USDT

    /* Buy/Base fee already removed when placing sell order  */
    order.new_ccy_amt = res.fillSz * res.fillPx;
    order.sell_price = res.fillPx;
    order.is_closed = true;
    order.sell_fee = fee;
    order.sell_timestamp = {
        i: order.sell_timestamp?.i,
        o: parseDate(new Date(res.fillTime)),
    };
    /* order == currentOrder */
    const bal = order.new_ccy_amt - Math.abs(res.fee);
    const profit = ((bal - order.ccy_amt) / order.ccy_amt) * 100;
    order.profit = profit;
    order.order_id = res.id;
    await order.save();
};

const updateBotAtClose = async (bot: IBot, order: IOrder, c: number) => {
    try {
        timedLog("TIMED: UPDATE AT CLOSE");

        const pos = true;
        timedLog("TIMED: ", { sell_px: order?.sell_price, pos });

        const { sell_price } = order;
        const plat = new Bybit(bot);
        timedLog({ ticker: c });
        const _tp = order.tp;

        if (sell_price < c && sell_price >= _tp) {
            botLog(
                bot,
                `TIMED: PLACING MARKET SELL ORDER AT CLOSE SINCE IT IS > STOP_PX`,
                { ts: parseDate(new Date()), c, sell_price, _tp }
            );
            const amt = order.base_amt - order.buy_fee;
            const r = await placeTrade({
                bot: bot,
                ts: parseDate(new Date()),
                amt: Number(amt),
                side: "sell",
                plat: plat,
                price: 0,
                ordType: "Market",
            });
            if (!r)
                return botLog(bot, "TIMED: FAILED TO PLACE MARKET SELL ORDER");
            botLog(bot, "TIMED: MARKET SELL PLACED. BOT REMOVED");
            return false;
        } else {
            timedLog("CLOSE PRICE NOT > SELL_PX", { c, _tp, sell_price });
            return true;
        }
    } catch (e) {
        console.log(e);
    }
};
