import { OrderPlacer } from "@/classes";
import { Bot, Order, TBot } from "@/models";
import { IBot } from "@/models/bot";
import { cancelJob, scheduleJob } from "node-schedule";
import { botJobSpecs, jobs } from "../constants";
import path from "path";
import fs from "fs";
import { IOrder } from "@/models/order";
import { OKX } from "@/classes/okx";
import { Document } from "mongoose";
import {
    botLog,
    getCoinPrecision,
    getPricePrecision,
    toFixed,
} from "../functions";
import { Bybit } from "@/classes/bybit";
import { AccountOrderV5 } from "bybit-api";
import { OrderDetails } from "okx-api";
import { chandelierExit, heikinAshi, parseDate, parseKlines } from "../funcs2";
import { objStrategies } from "@/strategies";

export const getJob = (id: string) => jobs.find((el) => el.id == id);

export const tuJob = async (op: OrderPlacer, bot: IBot) => {
    await op.checkPlaceOrder();
    op.cnt += 1;
};

export const addBotJob = (bot: IBot) => {
    const op = new OrderPlacer(bot as any);
    const id = `${bot._id}`;
    console.log(`\nAdding job for bot: ${bot.name}\n`);
    const job = scheduleJob(id, botJobSpecs, () => {
        tuJob(op, bot);
    });
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

export const updateOrder = async (bot: IBot, orders: IOrder[]) => {
    try {
        let lastOrder: IOrder | null = orders[orders.length - 1];
        let isClosed = lastOrder?.is_closed == true;
        const plat = bot.platform == "bybit" ? new Bybit(bot) : new OKX(bot);
        console.log(orders.length);

        if (
            orders.length &&
            (lastOrder.side == "buy" || lastOrder.order_id.length) &&
            !lastOrder.is_closed
        ) {
            /* If last order [ currentOrder ] is not yet closed */
            isClosed = lastOrder.is_closed;
            let isSellOrder = lastOrder.order_id.length > 0;

            const oid = isSellOrder
                ? lastOrder.order_id
                : lastOrder.buy_order_id;
            botLog(bot, "Checking order...");
            const res = await plat.getOrderbyId(oid);
            if (res) {
                let _isClosed = res != "live";

                if (isSellOrder) {
                    console.log(`\n[${bot.name}] : Updating sell order\n`);

                    if (_isClosed && res != "live") {
                        const fee = Math.abs(res.fee); // In USDT

                        /* Buy/Base fee already removed when placing sell order  */
                        lastOrder.new_ccy_amt = res.fillSz * res.fillPx;
                        lastOrder.sell_price = res.fillPx;
                        lastOrder.is_closed = _isClosed;
                        lastOrder.sell_fee = fee;
                        lastOrder.sell_timestamp = {
                            ...lastOrder.sell_timestamp,
                            o: parseDate(new Date(res.fillTime)),
                        };
                        /* lastOrder == currentOrder */
                        const bal = lastOrder.new_ccy_amt - Math.abs(res.fee);
                        const profit =
                            ((bal - lastOrder.ccy_amt) / lastOrder.ccy_amt) *
                            100;
                        lastOrder.profit = profit;
                        isClosed = _isClosed;
                        lastOrder.order_id = res.id;
                    } else {
                        /* Cancel if there's buyCondition  */
                        botLog(
                            bot,
                            "SELL ORDER NOT FILLED \nCHECKING FOR BUY_SIGNAL..."
                        );
                        const klines = await plat.getKlines({
                            end: Date.now() - bot.interval * 60 * 1000,
                        });

                        if (!klines) return console.log("FAILED TO GET KLINES");

                        const df = chandelierExit(
                            heikinAshi(parseKlines(klines), [bot.base, bot.ccy])
                        );

                        botLog(bot, "CHECKING BUY_SIGNAL...");
                        const currentCandle = df[df.length - 1];
                        const strategy = objStrategies[bot.strategy - 1];

                        console.log(currentCandle);
                        if (strategy.buyCond(currentCandle)) {
                            botLog(
                                bot,
                                "HAS BUY SIGNAL > CANCELLING SELL ORDER..."
                            );
                            const res = await plat.cancelOrder({ ordId: oid });
                            if (!res) {
                                botLog(bot, "FAILED TO CANCEL SELL ORDER");
                                return;
                            }
                            botLog(bot, "CLEARING SELL ORDER_ID...");
                            lastOrder.order_id = "";
                            lastOrder.sell_timestamp = undefined;
                            lastOrder.sell_price = 0;
                            await lastOrder.save();
                            botLog(bot, "ORDER_ID CLEARED");
                            return "ok";
                        }
                    }
                } else {
                    if (_isClosed && res != "live") {
                        console.log(`\n[${bot.name}] : Updating buy order\n`);
                        const ts = {
                            ...lastOrder.buy_timestamp,
                            o: parseDate(new Date(res.fillTime)),
                        };
                        console.log("TS", JSON.stringify(ts));
                        const fee = res.fee;
                        let base_amt = res.fillSz;
                        lastOrder.buy_order_id = res.id;
                        lastOrder.buy_price = res.fillPx;
                        lastOrder.buy_fee = Math.abs(fee);
                        lastOrder.base_amt = base_amt;
                        lastOrder.ccy_amt = res.fillSz * res.fillPx;
                        lastOrder.side = "sell";
                        lastOrder.buy_timestamp = ts;
                    } else {
                        /* Cancel if there's sellCondition  */
                        botLog(
                            bot,
                            "BUY ORDER NOT FILLED \nCHECKING FOR SELL_SIGNAL..."
                        );
                        const klines = await plat.getKlines({
                            end: Date.now() - bot.interval * 60 * 1000,
                        });

                        if (!klines) return console.log("FAILED TO GET KLINES");

                        const df = chandelierExit(
                            heikinAshi(parseKlines(klines), [bot.base, bot.ccy])
                        );

                        botLog(bot, "CHECKING SELL_SIGNAL...");
                        const currentCandle = df[df.length - 1];
                        const strategy = objStrategies[bot.strategy - 1];

                        console.log(currentCandle);
                        if (strategy.sellCond(currentCandle)) {
                            botLog(
                                bot,
                                "HAS SELL SIGNAL > CANCELLING BUY ORDER..."
                            );
                            const res = await plat.cancelOrder({ ordId: oid });
                            if (!res) {
                                botLog(bot, "FAILED TO CANCEL BUY ORDER");
                                return;
                            }
                            botLog(bot, "DELETING ORDER...");
                            botLog(bot, `Orders: ${bot.orders.length}`);
                            bot.orders = bot.orders.filter(
                                (el) => el != lastOrder!._id
                            );
                            botLog(bot, `Orders: ${bot.orders.length}`);
                            await Order.findByIdAndDelete(lastOrder!._id);
                            await bot.save();
                            botLog(bot, "ORDER DELETED");
                            return "ok";
                        }
                    }
                }
            } else {
                botLog(bot, "Order check error");
                return;
            }

            botLog(bot, "SAVING ORDER...");
            await lastOrder?.save();
            /*  
            const jobIndex = jobs.findIndex(el=> el.id == bot.id)
            jobs[jobIndex] = {...jobs[jobIndex], active : false}
            botLog(bot, `JOB CANCELLED ${jobIndex}\t ${jobs}`) */
        }
        return { isClosed, lastOrder };
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
    sl,
    plat,
}: {
    bot: IBot;
    ts: string;
    amt?: number;
    side: "buy" | "sell";
    price: number;
    sl?: number;
    plat: Bybit | OKX;
}) => {
    try {
        const orders = await Order.find({
            bot: bot._id,
            base: bot.base,
            ccy: bot.ccy,
        }).exec();

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
        console.log(`[ ${bot.name} ]\tAvail amt: ${amt}\n`);
        const { order_type } = bot;
        //botLog(bot, `Placing a ${side =='sell' ? amt : amt / price} ${side} order at ${price}...`);
        botLog(bot, `Placing a ${amt} ${side}  order at ${price}...`);
        price = toFixed(
            price,
            getPricePrecision([bot.base, bot.ccy], bot.platform)
        );
        amt =
            bot.order_type == "Market"
                ? amt
                : side == "sell"
                ? amt
                : amt / price;
        amt = toFixed(
            amt,
            getCoinPrecision(
                [bot.base, bot.ccy],
                order_type == "Limit" ? "sell" : side,
                bot.platform
            )
        );
        botLog(
            bot,
            `Placing a ${amt} ${side} ${bot.order_type} order at ${price}...`
        );
        const orderId = await plat.placeOrder(amt, price, side, sl);

        if (!orderId) {
            botLog(bot, "Failed to place order");
            return;
        }

        let order: IOrder;
        /// Save order
        if (side == "buy") {
            /* CRAETING A NEW BUY ORDER */
            order = new Order({
                buy_order_id: orderId,
                buy_price: price,
                buy_timestamp: { i: ts },
                //buy_fee: Number(useBybit ? (mOrder as AccountOrderV5).cumExecFee : (mOrder as any).fee),
                //ccy_amt: amt,
                side: side,
                bot: bot.id,
                base: bot.base,
                ccy: bot.ccy,
            });
        } else {
            /* CREATING A SELL ORDER */
            order = orders[orders.length - 1];
            order.order_id = orderId;
            order.sell_timestamp = { i: ts };
            //order.sell_fee = Number(useBybit ? (mOrder as AccountOrderV5).cumExecFee : (mOrder as any).fee);
            order.sell_price = price!;
            //order.base_amt = amt;
            order.side = side;
        }

        if (side == "buy") bot.orders.push(order._id);
        await order.save();
        await bot.save();
        botLog(bot, `${side} order placed, Bot updated`);
    } catch (error) {
        console.log(error);
        return;
    }
};
