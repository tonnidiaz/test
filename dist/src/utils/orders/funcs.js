"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeTrade = exports.updateOrder = exports.ensureDirExists = exports.addBotJob = exports.tuJob = exports.getJob = void 0;
const classes_1 = require("@/classes");
const models_1 = require("@/models");
const node_schedule_1 = require("node-schedule");
const constants_1 = require("../constants");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const functions_1 = require("../functions");
const funcs2_1 = require("../funcs2");
const funcs2_2 = require("./funcs2");
const getJob = (id) => constants_1.jobs.find((el) => el.id == id);
exports.getJob = getJob;
const tuJob = async (op, bot) => {
    await op.checkPlaceOrder();
    op.cnt += 1;
};
exports.tuJob = tuJob;
const addBotJob = async (bot) => {
    const op = new classes_1.OrderPlacer(bot);
    const id = `${bot._id}`;
    console.log(`\nAdding job for bot: ${bot.name}\n`);
    const job = (0, node_schedule_1.scheduleJob)(id, (0, constants_1.botJobSpecs)(bot.interval), () => {
        (0, exports.tuJob)(op, bot);
    });
    (0, functions_1.botLog)(bot, "JOB SCHEDULED");
    constants_1.jobs.push({ job, id, active: true });
};
exports.addBotJob = addBotJob;
const ensureDirExists = (filePath) => {
    var dirname = path_1.default.dirname(filePath);
    if (fs_1.default.existsSync(dirname)) {
        return true;
    }
    (0, exports.ensureDirExists)(dirname);
    console.log("Creating directory");
    fs_1.default.mkdirSync(dirname);
};
exports.ensureDirExists = ensureDirExists;
const updateOrder = async ({ bot, cancel = true, }) => {
    /* CHECK PREV ORDERS */
    try {
        (0, functions_1.botLog)(bot, "CHECKING PREV ORDERS");
        let order = await (0, funcs2_1.getLastOrder)(bot);
        let pos = (0, funcs2_1.orderHasPos)(order);
        const plat = (0, funcs2_1.getBotPlat)(bot);
        if (order && !pos) {
            // CURRENTLY NOT PLACING LIMIT BUY ORDERS
        }
        else if (order && pos && order.order_id) {
            const ordId = order.order_id;
            (0, functions_1.botLog)(bot, "CHECKING SELL ORDER...", { ordId });
            const res = await plat.getOrderbyId(ordId);
            if (!res) {
                (0, functions_1.botLog)(bot, "FAILED TO GET SELL ORDER");
            }
            else if (res == "live") {
                (0, functions_1.botLog)(bot, "SELL ORDER STILL ACTIVE");
                if (cancel) {
                    (0, functions_1.botLog)(bot, "CANCELLING ORDER...");
                    const r = await plat.cancelOrder({ ordId });
                    if (r) {
                        (0, functions_1.botLog)(bot, "SELL ORDER CANCELLED");
                        order.order_id = undefined;
                        await order.save();
                        console.log({ oid: order.order_id });
                    }
                    else {
                        (0, functions_1.botLog)(bot, "FAILED TO CANCEL SELL ORDER");
                    }
                }
            }
            else {
                await (0, funcs2_2.updateOrderInDb)(order, res);
            }
        }
        return { isClosed: false, lastOrder: "orderId" };
    }
    catch (e) {
        console.log(e);
    }
};
exports.updateOrder = updateOrder;
const placeTrade = async ({ bot, ts, amt, side, price, plat, sl, ordType = "Market", }) => {
    try {
        const orders = await (0, funcs2_1.findBotOrders)(bot);
        const pair = [bot.base, bot.ccy];
        const minSz = (0, functions_1.getMinSz)(pair, bot.platform);
        const maxSz = (0, functions_1.getMaxSz)(pair, bot.platform);
        const maxAmt = (0, functions_1.getMaxAmt)(pair, bot.platform);
        const minAmt = (0, functions_1.getMinAmt)(pair, bot.platform);
        const pxPr = (0, functions_1.getPricePrecision)(pair, bot.platform);
        const basePrecision = (0, functions_1.getCoinPrecision)(pair, "limit", bot.platform);
        if (minSz == null ||
            maxSz == null ||
            pxPr == null ||
            maxAmt == null ||
            basePrecision == null) {
            return;
        }
        let aside = bot.aside.find((el) => el.base == pair[0] && el.ccy == pair[1]);
        if (!aside) {
            aside = { base: bot.base, ccy: bot.ccy, amt: 0 };
            bot.aside.push(aside);
            await bot.save();
        }
        let total_base = bot.total_base.find((el) => el.base == pair[0] && el.ccy == pair[1]);
        if (!total_base) {
            total_base = { base: bot.base, ccy: bot.ccy, amt: 0 };
            bot.total_base.push(total_base);
            await bot.save();
        }
        let total_quote = bot.total_quote.find((el) => el.base == pair[0] && el.ccy == pair[1]);
        if (!total_quote) {
            total_quote = { base: bot.base, ccy: bot.ccy, amt: bot.start_bal };
            bot.total_quote.push(total_quote);
            await bot.save();
        }
        (0, functions_1.botLog)(bot, "PLACE_TRADE", { amt, price, side });
        const putAside = async (amt) => {
            if (!aside)
                return;
            (0, functions_1.botLog)(bot, `PUTTING ${amt} ASIDE...`);
            order.new_ccy_amt = order.new_ccy_amt - amt; // LEAVE THE FEE
            aside.amt = aside.amt + amt;
            bot.start_bal = order.new_ccy_amt - Math.abs(order.sell_fee);
            bot.aside?.map((el) => {
                return el.base == aside?.base && el.ccy == aside?.ccy
                    ? aside
                    : el;
            });
            await order.save();
            await bot.save();
            (0, functions_1.botLog)(bot, `${amt} PUT ASIDE`);
        };
        if (ordType == "Limit" && price == 0) {
            return (0, functions_1.botLog)(bot, "ERR: PRICE REQUIRED FOR LIMIT ORDERS");
        }
        if (!amt) {
            /// GET THE QUOTE BALANCE AND USE 75 IF THIS IS FIRST ORDER
            console.log(`\n[ ${bot.name} ]\tFIRST ORDER\n`);
            amt = await plat.getBal(bot.ccy);
            if (!amt) {
                (0, functions_1.botLog)(bot, "Failed to get balance");
                return;
            }
            /* Trade half assets */
            (0, functions_1.botLog)(bot, "No amount specified");
            if (side == "buy") {
                if (orders.length) {
                    const lastOrder = orders[orders.length - 1];
                    amt = lastOrder.new_ccy_amt - lastOrder.sell_fee;
                }
            }
            else {
                /// Sell all previously traded
                const lastOrder = orders[orders.length - 1];
                amt = lastOrder.base_amt - lastOrder.buy_fee;
            }
        }
        if (side == "buy") {
            const _entry = price;
            const _base = amt / price;
            if (_base < minSz || amt < (minAmt ?? 1)) {
                const msg = `BASE: ${_base} < MIN_SZ: ${minSz}`;
                return (0, functions_1.botLog)(bot, msg);
            }
            else if (_base > maxSz) {
                const msg = `BASE: ${_base} > MAX_SZ: ${maxSz}`;
                (0, functions_1.botLog)(bot, msg);
                amt = maxSz * (1 - 0.5 / 100) * _entry;
                amt = (0, functions_1.toFixed)(amt, pxPr);
                return await (0, exports.placeTrade)({
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
        else {
            // SELL
            let _base = amt;
            const _bal = _base * price;
            if (_bal < (minAmt ?? 1)) {
                (0, functions_1.botLog)(bot, "EKSE, THIS SHIT < MIN");
                return;
            }
            else if (_bal > maxAmt) {
                console.log(`BAL ${_bal} > MAX_AMT ${maxAmt}`);
                _base = (maxAmt * (1 - 0.5 / 100)) / price;
                _base = (0, functions_1.toFixed)(_base, basePrecision);
                amt = _base;
            }
        }
        (0, functions_1.botLog)(bot, `Placing a ${amt} ${side}  order at ${price}...`);
        sl = (0, functions_1.toFixed)(sl ?? 0, pxPr);
        price = (0, functions_1.toFixed)(price, pxPr);
        amt = ordType == "Market" ? amt : side == "sell" ? amt : amt / price;
        amt = (0, functions_1.toFixed)(amt, basePrecision);
        (0, functions_1.botLog)(bot, `Placing a ${ordType} ${amt} ${side} order at ${price}...`);
        const clOrderId = Date.now().toString();
        const order = side == "buy"
            ? new models_1.Order({
                _entry: price,
                buy_timestamp: { i: ts },
                side: side,
                bot: bot.id,
                base: bot.base,
                ccy: bot.ccy,
                ccy_amt: amt
            })
            : orders[orders.length - 1];
        order.cl_order_id = clOrderId;
        if (side == "sell") {
            order._exit = price;
        }
        await order.save();
        if (side == "buy")
            bot.orders.push(order._id);
        const px = ordType == "Market" ? undefined : price;
        const orderId = await plat.placeOrder(amt, px, side, sl, clOrderId);
        if (!orderId) {
            (0, functions_1.botLog)(bot, "Failed to place order");
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
                    await (0, functions_1.sleep)(1000);
                    (0, functions_1.botLog)(bot, "CHECKING MARKET BUY ORDER...");
                    const res = await plat.getOrderbyId(orderId);
                    if (!res) {
                        _filled = true;
                        return (0, functions_1.botLog)(bot, "FAILED TO CHECK MARKET BUY ORDER");
                    }
                    if (res != "live") {
                        _filled = true;
                        const ts = {
                            i: order.buy_timestamp?.i,
                            o: (0, funcs2_1.parseDate)(new Date(res.fillTime)),
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
        }
        else if (side == "sell" && ordType == "Market") {
            (0, functions_1.botLog)(bot, "CHECKING MARKET SELL STATUS...");
            let _filled = false;
            while (!_filled) {
                await (0, functions_1.sleep)(500);
                (0, functions_1.botLog)(bot, "CHECKING MARKET SELL ORDER...");
                const res = await plat.getOrderbyId(orderId);
                if (!res) {
                    _filled = true;
                    return (0, functions_1.botLog)(bot, "FAILED TO CHECK MARKET SELL ORDER");
                }
                if (res && res != "live") {
                    _filled = true;
                    await (0, funcs2_2.updateOrderInDb)(order, res);
                    //return { isClosed: true, lastOrder: order };
                }
            }
        }
        else if (side == "sell" && ordType == "Limit") {
            /* CREATING A SELL ORDER */
            order.order_id = orderId;
            order.sell_timestamp = { i: ts };
            order.sell_price = price;
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
        }
        else if (side == "sell" && ordType == "Market") {
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
        (0, functions_1.botLog)(bot, `${side} order placed, Bot updated`);
        return order._id;
    }
    catch (error) {
        console.log(error);
        return;
    }
};
exports.placeTrade = placeTrade;
//# sourceMappingURL=funcs.js.map