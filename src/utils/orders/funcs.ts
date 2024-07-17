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
    chandelierExit,
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
        const plat = new OKX(bot);
        botLog(bot, "GETTING KLINES TO SEE IF BUY/SL SELL CAN BE FILLED...");
        const klines = await plat.getKlines({});

        if (!klines) return botLog(bot, "FAILED TO GET KLINES");
        const df = heikinAshi(parseKlines(klines));
        const prevRow = df[df.length - 1];
        const isGreen = prevRow.c >= prevRow.o;
        if (!order) return { isClosed, lastOrder: null, prevRow, isGreen };

        /* if (order.side == "sell" && !order.order_id.length) {
            return false;
        } */

        const pos =
            order &&
            order.side == "sell" &&
            !order.is_closed &&
            order.buy_order_id.length;
        let entryLimit = order.buy_price;
        let exitLimit = order.sell_price;

        if (orders.length && !pos && entryLimit != 0) {
            /* CHECK IF BUY CONDITIONS ARE MET */

            // const sl = entryLimit * (1 + SL2 / 100);
            // const isHaHit = prevRow.ha_l < entryLimit;
            // const entryFromLow = Number(
            //     (((prevRow.l - prevRow.ha_l) / prevRow.ha_l) * 100).toFixed(2)
            // );
            // botLog(bot, { entryLimit, sl, isHaHit, entryFromLow, prevRow });

            // if (isHaHit && entryFromLow < 0.5) {
            //     /* RE-ADJUST ENTRY LIMIT */
            //     entryLimit *= 1 + entryFromLow / 100;
            //     entryLimit = Number(entryLimit.toFixed(pxPr));
            //     order.buy_price = entryLimit;
            //     await order.save();
            // }

            // if (isGreen && (prevRow.l < entryLimit || prevRow.l < sl)) {
            //     /* EITHER THE LIMIT OR THE SL WAS REACHED */
            //     /* PLACE MARKET BUY */
            //     const amt = order && order.buy_order_id.length
            //         ? order.new_ccy_amt - Math.abs(order.sell_fee)
            //         : bot.start_amt;

            //     const ts = new Date();
            //     const res = await placeTrade({
            //         bot: bot,
            //         ts: parseDate(ts),
            //         amt,
            //         side: "buy",
            //         price: 0 /* 0 for market buy */,
            //         plat: plat,
            //     });
            //     if (res) {
            //         botLog(bot, "MARKET BUY ORDER PLACED. TO SIGNALS CHECK SEC");
            //     }
            // }
            await order?.save();
        } else if (pos && exitLimit != 0 && !order.is_closed) {
            /* ORDER WAS  NOT FILLED AT EXIT */
            //const sl = entryLimit * (1 - SL2 / 100);
            //if (sl < prevRow.h && !isGreen) {
            //   botLog(bot, "FILL SELL AT SL");
            //   botLog(bot, { exitLimit, sl, prevRow });
            //   const amt = order.base_amt - order.buy_fee;
            //   const r = await placeTrade({
            //       bot: bot,
            //       ts: parseDate(new Date()),
            //       amt: Number(amt),
            //       side: "sell",
            //       plat: plat,
            //       price: 0,
            //   });
            //   if (!r) botLog(bot, "FAILED TO PLACE MARKET SELL ORDER");
            //}else{
            //    botLog(bot, "ADD BOT TO WS")
            //    return false
            //}
        }
        return { isClosed, lastOrder: order.id, prevRow, isGreen };
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
    plat: OKX;
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
                            ...order.buy_timestamp,
                            o: parseDate(new Date(res.fillTime)),
                        };
                        console.log("TS", JSON.stringify(ts));
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
                    return { isClosed: true, lastOrder: order };
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
        if (side == "buy") return order;
    } catch (error) {
        console.log(error);
        return;
    }
};
