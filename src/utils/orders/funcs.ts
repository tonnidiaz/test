import { OrderPlacer } from "@/classes";
import { Bot, Order } from "@/models";
import { IBot } from "@/models/bot";
import { scheduleJob } from "node-schedule";
import { SL2, botJobSpecs, isStopOrder, jobs } from "../constants";
import path from "path";
import fs from "fs";
import { IOrder } from "@/models/order";
import { OKX } from "@/classes/okx";
import {
    botLog,
    getCoinPrecision,
    getPricePrecision,
    sleep,
    toFixed,
} from "../functions";
import { Bybit } from "@/classes/bybit";
import {
    calcSL,
    tuCE,
    findBotOrders,
    heikinAshi,
    parseDate,
    parseKlines,
} from "../funcs2";
import { objStrategies } from "@/strategies";
import { updateOrderInDb } from "./funcs2";

export const getJob = (id: string) => jobs.find((el) => el.id == id);

export const tuJob = async (op: OrderPlacer, bot: IBot) => {
    await op.checkPlaceOrder();
    op.cnt += 1;
};

export const addBotJob = async (bot: IBot) => {
    const op = new OrderPlacer(bot as any);
    const id = `${bot._id}`;
    console.log(`\nAdding job for bot: ${bot.name}\n`);
    const job = scheduleJob(id, botJobSpecs(bot.interval), () => {
        tuJob(op, bot);
    });
    botLog(bot, "JOB SCHEDULED");
    jobs.push({ job, id, active: true });
};

export const ensureDirExists = (filePath: string) => {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirExists(dirname);
    console.log("Creating directory");
    fs.mkdirSync(dirname);
};

export const updateOrder = async (bot: IBot) => {
    /* CHECK PREV ORDERS */
    try {
        const pxPr = getPricePrecision([bot.base, bot.ccy], bot.platform);
        const orders = await findBotOrders(bot);

        let order: IOrder | null = orders[orders.length - 1];
        let isClosed = !order || order?.is_closed == true;
        if (!order || isClosed) return { isClosed, lastOrder: "null" };
        let orderId = order._id;
  
        const pos =
            order &&
            order.side == "sell" &&
            !order.is_closed &&
            order.buy_order_id.length != 0;
        let entryLimit = order.buy_price;
        let exitLimit = order.sell_price;

        if (pos && exitLimit != 0 && !order.is_closed) {
          
        }
        return { isClosed, lastOrder: orderId };
    } catch (e) {
        console.log(e);
    }
};

export const placeTrade = async ({
    bot,
    ts,
    amt,
    side,
    price,
    plat,
    sl,
}: {
    bot: IBot;
    ts: string;
    amt?: number;
    sl?: number;
    side: "buy" | "sell";
    price: number;
    plat: OKX | Bybit;
}) => {
    try {
        const orders = await findBotOrders(bot);

        if (!amt) {
            /// GET THE QUOTE BALANCE AND USE 75 IF THIS IS FIRST ORDER

            console.log(`\n[ ${bot.name} ]\tFIRST ORDER\n`);
            amt = await plat.getBal(bot.ccy);
            if (!amt) {
                botLog(bot, "Failed to get balance");
                return;
            }
            /* Trade half assets */
            botLog(bot, "No amount specified");
            if (side == "buy") {
                if (orders.length) {
                    const lastOrder = orders[orders.length - 1];
                    amt = lastOrder.new_ccy_amt - lastOrder.sell_fee;
                }
            } else {
                /// Sell all previously traded
                const lastOrder = orders[orders.length - 1];
                amt = lastOrder.base_amt - lastOrder.buy_fee;
            }
        }
        const pxPr = getPricePrecision(
            [bot.base, bot.ccy],
            bot.platform
        ); /* Price precision */
        console.log(`[ ${bot.name} ]\tAvail amt: ${amt}\n`);
        const { order_type } = bot;
        //botLog(bot, `Placing a ${side =='sell' ? amt : amt / price} ${side} order at ${price}...`);
        botLog(bot, `Placing a ${amt} ${side}  order at ${price}...`);
        sl = toFixed(sl ?? 0, pxPr);
        price = toFixed(price, pxPr);
        amt =
            bot.order_type == "Market" || isStopOrder
                ? amt
                : side == "sell"
                ? amt
                : amt / price;
        amt = toFixed(
            amt,
            getCoinPrecision(
                [bot.base, bot.ccy],
                side == "sell" ? "limit" : "market",
                bot.platform
            )
        );
        botLog(
            bot,
            `Placing a ${amt} ${side} ${bot.order_type} SL: ${sl} order at ${price}...`
        );

        const clOrderId = Date.now().toString();

        const order =
            side == "buy"
                ? new Order({
                      buy_price: price,
                      buy_timestamp: { i: ts },
                      side: side,
                      bot: bot.id,
                      base: bot.base,
                      ccy: bot.ccy,
                  })
                : orders[orders.length - 1];

        order.cl_order_id = clOrderId;
        await order.save();
        if (side == "buy") bot.orders.push(order._id);

        const orderId = await plat.placeOrder(amt, price, side, sl, clOrderId);

        if (!orderId) {
            botLog(bot, "Failed to place order");
            return;
        }

        /// Save order
        if (side == "buy") {
            /* CRAETING A NEW BUY ORDER */
            order.buy_order_id = orderId;

            if (price == 0 || order_type == "Market") {
                /* KEEP CHECKING BUY ORDER TILL FILLED */
                let _filled = false;
                while (!_filled) {
                    await sleep(1000);
                    botLog(bot, "CHECKING MARKET BUY ORDER...");
                    const res = await plat.getOrderbyId(orderId);

                    if (!res) {
                        _filled = true;
                        return botLog(bot, "FAILED TO CHECK MARKET BUY ORDER");
                    }
                    if (res != "live") {
                        _filled = true;
                        const ts = {
                            i: order.buy_timestamp?.i,
                            o: parseDate(new Date(res.fillTime)),
                        };
                        console.log("TS", ts);
                        const fee = res.fee;
                        let base_amt = res.fillSz;
                        order.buy_order_id = res.id;
                        order.buy_price = res.fillPx;
                        order.buy_fee = Math.abs(fee);
                        order.base_amt = base_amt;
                        order.ccy_amt = res.fillSz * res.fillPx;
                        order.side = "sell";
                        order.buy_timestamp = ts;
                    }
                }
            }
        } else if (side == "sell" && !sl && price == 0) {
            botLog(bot, "CHECKING MARKET SELL STATUS...");

            let _filled = false;
            while (!_filled) {
                await sleep(1000);
                botLog(bot, "CHECKING MARKET SELL ORDER...");
                const res = await plat.getOrderbyId(orderId);

                if (!res) {
                    _filled = true;
                    return botLog(bot, "FAILED TO CHECK MARKET SELL ORDER");
                }
                if (res && res != "live") { 
                    _filled = true;
                    await updateOrderInDb(order, res);
                    //return { isClosed: true, lastOrder: order };
                }
            }
        } else {
            /* CREATING A SELL ORDER */

            order.order_id = orderId;
            order.sell_timestamp = { i: ts };
            order.sell_price = price!;
            order.side = side;
        }

        await order.save();
        await bot.save();
        botLog(bot, `${side} order placed, Bot updated`);
        return order._id;
    } catch (error) {
        console.log(error);
        return;
    }
};
