"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderInDb = exports.afterOrderUpdate = void 0;
const funcs2_1 = require("../funcs2");
const funcs_1 = require("./funcs");
const functions_1 = require("../functions");
const consts2_1 = require("../consts2");
const constants_1 = require("../constants");
const bybit_1 = require("@/classes/bybit");
const impr_prod_1 = require("./strategies/impr.prod");
//import { wsOkx } from "@/classes/main-okx";
const useDef5 = false, useDef60 = true;
const afterOrderUpdate = async ({ bot }) => {
    const plat = new consts2_1.objPlats[bot.platform](bot);
    //await sleep(500)
    (0, functions_1.botLog)(bot, "SIM: GETTING KLINES...");
    const end = (0, funcs2_1.getExactDate)(bot.interval);
    const klines = await plat.getKlines({ end: end.getTime() });
    //const o = await plat.getTicker()
    if (!klines)
        return console.log("FAILED TO GET KLINES");
    //if (!o) return console.log("FAILED TO GET TICKER");
    let df = (0, funcs2_1.parseKlines)(klines);
    let prevrow = df[df.length - 2];
    let row = df[df.length - 1];
    (0, functions_1.botLog)(bot, { prevrow: prevrow.ts, row: row.ts });
    if (prevrow.v == 0) {
        (0, functions_1.botLog)(bot, "VOL: SKIPPING");
        return;
    }
    df = (0, funcs2_1.tuCE)((0, funcs2_1.heikinAshi)(df));
    const pxPr = (0, functions_1.getPricePrecision)([bot.base, bot.ccy], bot.platform);
    const basePr = (0, functions_1.getCoinPrecision)([bot.base, bot.ccy], "limit", bot.platform);
    if (pxPr == null || basePr == null)
        return;
    prevrow = df[df.length - 2];
    row = df[df.length - 1]; //{ts: parseDate(end), o, h: o, l:o, c: o, v: prevrow.v, ha_o: o,ha_h: o, ha_l:o, ha_c: o };
    let order = await (0, funcs2_1.getLastOrder)(bot);
    let pos = (0, funcs2_1.orderHasPos)(order);
    (0, functions_1.botLog)(bot, { ts: row.ts, o: row.o });
    if (constants_1.DEV)
        return;
    const params = { row, prevrow, bot, order, pos, pxPr, basePr };
    //await cloud5Prod(params)
    //await def5Prod(params);
    await (0, impr_prod_1.ImprProd)(params);
    // if (useDef5) {
    //     await prodStr5(params);
    // } else if (useDef60) {
    //     await prodStr60({ row, prevrow, bot, order, pos, pxPr, basePr });
    // }
};
exports.afterOrderUpdate = afterOrderUpdate;
const updateOrderInDb = async (order, res) => {
    const fee = Math.abs(res.fee); // In USDT
    /* Buy/Base fee already removed when placing sell order  */
    order.new_ccy_amt = res.fillSz * res.fillPx;
    order.sell_price = res.fillPx;
    order.is_closed = true;
    order.sell_fee = fee;
    order.sell_timestamp = {
        i: order.sell_timestamp?.i,
        o: (0, funcs2_1.parseDate)(new Date(res.fillTime)),
    };
    /* order == currentOrder */
    const bal = order.new_ccy_amt - Math.abs(res.fee);
    const profit = ((order.sell_price - order.buy_price) / order.buy_price) * 100; // ((bal - order.ccy_amt) / order.ccy_amt * 100) ;
    order.profit = (0, functions_1.toFixed)(profit, 2);
    order.order_id = res.id;
    await order.save();
};
exports.updateOrderInDb = updateOrderInDb;
const updateBotAtClose = async (bot, order, c) => {
    try {
        (0, functions_1.timedLog)("TIMED: UPDATE AT CLOSE");
        const pos = true;
        (0, functions_1.timedLog)("TIMED: ", { sell_px: order?.sell_price, pos });
        const { sell_price } = order;
        const plat = new bybit_1.Bybit(bot);
        (0, functions_1.timedLog)({ ticker: c });
        const _tp = order.tp;
        if (sell_price < c && sell_price >= _tp) {
            (0, functions_1.botLog)(bot, `TIMED: PLACING MARKET SELL ORDER AT CLOSE SINCE IT IS > STOP_PX`, { ts: (0, funcs2_1.parseDate)(new Date()), c, sell_price, _tp });
            const amt = order.base_amt - order.buy_fee;
            const r = await (0, funcs_1.placeTrade)({
                bot: bot,
                ts: (0, funcs2_1.parseDate)(new Date()),
                amt: Number(amt),
                side: "sell",
                plat: plat,
                price: 0,
                ordType: "Market",
            });
            if (!r)
                return (0, functions_1.botLog)(bot, "TIMED: FAILED TO PLACE MARKET SELL ORDER");
            (0, functions_1.botLog)(bot, "TIMED: MARKET SELL PLACED. BOT REMOVED");
            return false;
        }
        else {
            (0, functions_1.timedLog)("CLOSE PRICE NOT > SELL_PX", { c, _tp, sell_price });
            return true;
        }
    }
    catch (e) {
        console.log(e);
    }
};
//# sourceMappingURL=funcs2.js.map