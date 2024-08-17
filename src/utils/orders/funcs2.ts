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
import { botLog, ceil, getCoinPrecision, getPricePrecision, timedLog, toFixed } from "../functions";
import { objStrategies } from "@/strategies";
import { IObj, IOrderDetails } from "../interfaces";
import { wsOkx } from "@/classes/main-okx";
import { objPlats } from "../consts2";
import { wsBybit } from "@/classes/main-bybit";
import { SL } from "../constants";
import { Bybit } from "@/classes/bybit";
//import { wsOkx } from "@/classes/main-okx";

export const afterOrderUpdate = async ({ bot }: { bot: IBot }) => {
    const plat = new objPlats[bot.platform](bot);

    botLog(bot, "SIM: GETTING KLINES...");
    const klines = await plat.getKlines({ end: Date.now() });

    if (!klines) return console.log("FAILED TO GET KLINES");

    const df = tuCE(heikinAshi(parseKlines(klines)));

    const pxPr = getPricePrecision([bot.base, bot.ccy], bot.platform);
        const basePrecision = getCoinPrecision([bot.base, bot.ccy], "limit", bot.platform);

        if (pxPr == null || basePrecision == null) return 
    const row = df[df.length - 1];
    const prevRow = df[df.length - 2];
    const isGreen = prevRow.c >= prevRow.o;

    botLog(bot, { row: row.ts, prevRow: prevRow.ts });
    const strategy = objStrategies[bot.strategy - 1];
    botLog(bot, strategy);

    let order = await Order.findById(bot.orders[bot.orders.length - 1].id).exec();

    let pos =
            order &&
            order.side == "sell" &&
            !order.is_closed &&
            order.buy_order_id.length != 0;

        const { o, ts } = row;

        if (!order || !pos){
            botLog(bot, "KAYA RA BUY")

            const entry = o
            botLog(bot, `MARKET BUY ORDER AT ${o}`)
            const amt = order ? order.new_ccy_amt - Math.abs(order.sell_fee) : bot.start_bal;

            const r = await placeTrade({
                bot: bot,
                ts: parseDate(new Date()),
                amt,
                side: "buy",
                price: 0 /* 0 for market buy */,
                plat: plat,
                ordType: 'Market'
            });

            if (!r){
              return   botLog(bot, "FAILED TO PLACE BUY ORDER")
            }

            order = (await Order.findById(r).exec())!
            pos = true


            if (!isGreen){
                console.log("SKIPING...")
                return
            }
        }
        if (pos && order) {
            const TP = 5,
                SL = 1.2,
                TRAIL = 0.1;

            const entry = order.buy_price;
            const tp = ceil(o * (1 + TP / 100), pxPr);
            const trail = ceil(prevRow.h * (1 - TRAIL / 100), pxPr);
            const sl = ceil(entry * (1 - SL / 100), pxPr);
            
            let exit = 0;

            let _base = order.base_amt - order.buy_fee;

            if (o >= trail && isGreen) {
                timedLog("OPEN > TRAIL");
                exit = o;
                if (o < entry) _base /= 2
                else if (!isGreen) _base /= 3

            }
            _base = toFixed(_base, basePrecision)
            botLog(bot, {_base})

            if (exit != 0 && exit >= sl) {
                timedLog("PLACING SELL ORDER AT OPEN", { volume: row.v, exit });

                const amt = _base
                const r = await placeTrade({
                    bot: bot,
                    ts: parseDate(new Date()),
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: exit,
                    ordType: "Market"
                });

                if (!r){return timedLog("COULD NOT PLACE SELL ORDER")}
                botLog(bot, "SELL ORDER PLACED")
            }
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

    try{
      timedLog("TIMED: UPDATE AT CLOSE");

    const pos = true
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
            ordType: "Market"
        });
        if (!r) return botLog(bot, "TIMED: FAILED TO PLACE MARKET SELL ORDER");
        botLog(bot, "TIMED: MARKET SELL PLACED. BOT REMOVED");
        return false
    } else {
        timedLog("CLOSE PRICE NOT > SELL_PX", { c, _tp, sell_price });
        return true
    }  
    }
    catch(e){
        console.log(e);
    }
};