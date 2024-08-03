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
import { botLog, timedLog } from "../functions";
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
    const klines = await plat.getKlines({});

    if (!klines) return console.log("FAILED TO GET KLINES");

    const df = tuCE(heikinAshi(parseKlines(klines)));

    const row = df[df.length - 1];
    const prevRow = row;
    botLog(bot, "CANDLE");
    console.log(row);

    const strategy = objStrategies[bot.strategy - 1];
    botLog(bot, strategy);

    let order = await Order.findById(bot.orders[bot.orders.length - 1].id).exec();

    let pos =
        order &&
        order.side == "sell" &&
        !order.is_closed &&
        order.buy_order_id.length != 0;
    console.log({ pos });

    /* ------ START ---------- */
    if (pos && order && !order.is_closed){
        /* SAME AS AT CLOSE, FILL ORDER IF CONDITIONS ARE MET AND UPDATE POSITION */
        botLog(bot, "AT CLOSE [NEW CANDLE]")
        
        const _r = await updateBotAtClose(bot, order, df[df.length - 1].c)
        if (_r != undefined){
            pos = _r
        }
    }
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
            order = (await Order.findById(res).exec())!;
            order.sl = order.buy_price * (1 - SL/100)
            await order.save()
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

    /* RMOVE BOT FROM WS JUST IN CASE */
    const ws = bot.platform == 'bybit' ? wsBybit : wsOkx
    await ws.rmvBot(bot.id)
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

        
        await ws.addBot(bot.id, true);
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