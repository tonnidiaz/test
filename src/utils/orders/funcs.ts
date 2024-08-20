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
    ceil,
    getCoinPrecision,
    getMaxAmt,
    getMaxSz,
    getMinSz,
    getPricePrecision,
    sleep,
    timedLog,
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
    getLastOrder,
    orderHasPos,
    getBotPlat,
} from "../funcs2";
import { objStrategies } from "@/strategies";
import { updateOrderInDb } from "./funcs2";
import { objPlats } from "../consts2";

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

export const updateOrder = async ({
    bot,
    cancel = true,
}: {
    bot: IBot;
    cancel?: boolean;
}) => {
    /* CHECK PREV ORDERS */
    try {
        botLog(bot, "CHECKING PREV ORDERS");

        let order = await getLastOrder(bot);
        let pos = orderHasPos(order);

        const plat = getBotPlat(bot);

        if (order && !pos) {
            // CURRENTLY NOT PLACING LIMIT BUY ORDERS
        } else if (order && pos && order.order_id.length) {
            

            const ordId = order.order_id;
            botLog(bot, "CHECKING SELL ORDER...", {ordId});
            const res = await plat.getOrderbyId(ordId);
            if (!res) {
                botLog(bot, "FAILED TO GET SELL ORDER");
            } else if (res == "live") {
                botLog(bot, "SELL ORDER STILL ACTIVE");

                if (cancel) {
                    botLog(bot, "CANCELLING ORDER...");
                    const r = await plat.cancelOrder({ ordId });
                    if (r) {
                        botLog(bot, "SELL ORDER CANCELLED");
                        order.order_id == "";
                        await order.save()
                    } else {
                        botLog(bot, "FAILED TO CANCEL SELL ORDER");
                    }
                }
            } else {
                await updateOrderInDb(order, res);
            }
        }

        return { isClosed: false, lastOrder: "orderId" };
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
    ordType = "Market",
}: {
    bot: IBot;
    ts: string;
    amt?: number;
    sl?: number;
    side: "buy" | "sell";
    price: number;
    plat: OKX | Bybit;
    ordType?: "Limit" | "Market";
}) => {
    try {
        const orders = await findBotOrders(bot);
        const pair = [bot.base, bot.ccy];
        const minSz = getMinSz(pair, bot.platform);
        const maxSz = getMaxSz(pair, bot.platform);
        const maxAmt = getMaxAmt(pair, bot.platform);
        const pxPr = getPricePrecision(pair, bot.platform);
        const basePrecision = getCoinPrecision(pair, "limit", bot.platform);
        if (
            minSz == null ||
            maxSz == null ||
            pxPr == null ||
            maxAmt == null ||
            basePrecision == null
        ) {
            return;
        }
        let aside = bot.aside.find(
            (el) => el.base == pair[0] && el.ccy == pair[1]
        );
        if (!aside) {
            aside = { base: bot.base, ccy: bot.ccy, amt: 0 };
            bot.aside.push(aside);
            await bot.save();
        }
        let total_base = bot.total_base.find(
            (el) => el.base == pair[0] && el.ccy == pair[1]
        );
        if (!total_base) {
            total_base = { base: bot.base, ccy: bot.ccy, amt: 0 };
            bot.total_base.push(total_base);
            await bot.save();
        }
        let total_quote = bot.total_quote.find(
            (el) => el.base == pair[0] && el.ccy == pair[1]
        );
        if (!total_quote) {
            total_quote = { base: bot.base, ccy: bot.ccy, amt: bot.start_bal };
            bot.total_quote.push(total_quote);
            await bot.save();
        }

        botLog(bot, "PLACE_TRADE", { amt, price, side });

        const putAside = async (amt: number) => {
            if (!aside) return
            botLog(bot, `PUTTING ${amt} ASIDE...`);
            order.new_ccy_amt = order.new_ccy_amt - amt; // LEAVE THE FEE
            aside.amt = aside!.amt + amt;
            bot.start_bal = order.new_ccy_amt - Math.abs(order.sell_fee);

            bot.aside?.map((el) => {
                return el.base == aside?.base && el.ccy == aside?.ccy
                    ? aside
                    : el;
            });

            await order.save();
            await bot.save();

            botLog(bot, `${amt} PUT ASIDE`);
        };

        if (ordType == "Limit" && price == 0) {
            return botLog(bot, "ERR: PRICE REQUIRED FOR LIMIT ORDERS");
        }

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

        if (side == "buy") {
            const _entry = price;

            const _base = amt / price;
            if (_base < minSz) {
                const msg = `BASE: ${_base} < MIN_SZ: ${minSz}`;
                return botLog(bot, msg);
            } else if (_base > maxSz) {
                const msg = `BASE: ${_base} > MAX_SZ: ${maxSz}`;

                botLog(bot, msg);

                amt = maxSz * (1 - 0.5 / 100) * _entry;
                amt = toFixed(amt, pxPr);
                return await placeTrade({
                    bot,
                    ts,
                    amt,
                    side,
                    price,
                    plat,
                    sl,
                    ordType,
                });
            }
        } else {
            let _base = amt;
            const _bal = _base * price;
            if (_bal > maxAmt) {
                console.log(`BAL ${_bal} > MAX_AMT ${maxAmt}`);
                _base = (maxAmt * (1 - 0.5 / 100)) / price;

                _base = toFixed(_base, basePrecision);
                amt = _base;
                return await placeTrade({
                    bot,
                    ts,
                    amt,
                    side,
                    price,
                    plat,
                    sl,
                    ordType,
                });
            }
        }

        botLog(bot, `Placing a ${amt} ${side}  order at ${price}...`);
        sl = toFixed(sl ?? 0, pxPr);
        price = toFixed(price, pxPr);
        amt = ordType == "Market" ? amt : side == "sell" ? amt : amt / price;

        amt = toFixed(amt, basePrecision);
        botLog(bot, `Placing a ${ordType} ${amt} ${side} order at ${price}...`);

        const clOrderId = Date.now().toString();

        const order =
            side == "buy"
                ? new Order({
                      _entry: price,
                      buy_timestamp: { i: ts },
                      side: side,
                      bot: bot.id,
                      base: bot.base,
                      ccy: bot.ccy,
                  })
                : orders[orders.length - 1];

        order.cl_order_id = clOrderId;
        if (side == "sell") {
            order._exit = price;
        }
        await order.save();
        if (side == "buy") bot.orders.push(order._id)
        const px = ordType == "Market" ? undefined : price

        const orderId = await plat.placeOrder(amt, px, side, sl, clOrderId);

        if (!orderId) {
            botLog(bot, "Failed to place order");
            return;
        }

        /// Save order
        if (side == "buy") {
            /* CRAETING A NEW BUY ORDER */
            order.buy_order_id = orderId;

            if (ordType == "Market") {
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
                        order.new_ccy_amt = res.fillSz * res.fillPx;
                        order.side = "sell";
                        order.buy_timestamp = ts;
                    }
                }
            }
        } else if (side == "sell" && ordType == "Market") {
            botLog(bot, "CHECKING MARKET SELL STATUS...");

            let _filled = false;
            while (!_filled) {
                await sleep(500);
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
        } else if (side == "sell" && ordType == "Limit") {
            /* CREATING A SELL ORDER */

            order.order_id = orderId;
            order.sell_timestamp = { i: ts };
            order.sell_price = price!;
            order.side = side;
        }
        let quote_amt = total_quote.amt;
        let base_amt = total_base.amt;
        if (side == "buy") {
            // Subtract from
            if (quote_amt == 0) {
                quote_amt = bot.start_bal;
            }

            quote_amt -= amt;
            base_amt += order.base_amt - order.buy_fee;
        } else if (side == "sell" && ordType == "Market") {
            base_amt -= amt;
            quote_amt += order.new_ccy_amt - order.sell_fee;

            // PUT ASIDE

            const START_BAL = bot.start_bal;

            const profitPerc = ((quote_amt - START_BAL) / START_BAL) * 100;
            if (profitPerc >= 100) {
               // await putAside(quote_amt / 2.5);
            }
        }

        total_quote.amt = quote_amt;
        total_base.amt = base_amt;

        bot.total_quote.map((el) => {
            return el.base == total_quote?.base && el.ccy == total_quote?.ccy
                ? total_quote
                : el;
        });
        bot.total_quote.map((el) => {
            return el.base == total_quote?.base && el.ccy == total_quote?.ccy
                ? total_quote
                : el;
        });
        await order.save();
        await bot.save();
        botLog(bot, `${side} order placed, Bot updated`);
        return order._id;
    } catch (error) {
        console.log(error);
        return;
    }
};
