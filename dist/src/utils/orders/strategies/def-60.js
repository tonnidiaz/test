"use strict";
/**
 * WORKS BEST WITH THE 30min TIMEFRAME
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodStrategy = void 0;
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const funcs_1 = require("../funcs");
const models_1 = require("@/models");
const prodStrategy = async ({ pos, order, bot, row, prevrow, pxPr, basePr, }) => {
    (0, functions_1.botLog)(bot, exports.prodStrategy);
    const plat = (0, funcs2_1.getBotPlat)(bot);
    const str = (0, funcs2_1.getBotStrategy)(bot);
    (0, functions_1.botLog)(bot, { str, pos });
    const { ts, o, h, l, c } = row;
    const isGreen = prevrow.c >= prevrow.o;
    let entry = order?._entry;
    if (!pos && str.buyCond(prevrow)) {
        (0, functions_1.botLog)(bot, "KAYA RA BUY");
        const amt = (0, funcs2_1.getAmtToBuyWith)(bot, order);
        entry = o;
        const r = await (0, funcs_1.placeTrade)({
            bot: bot,
            ts,
            amt,
            side: "buy",
            price: entry,
            plat: plat,
            ordType: "Market",
        });
        if (!r) {
            return (0, functions_1.botLog)(bot, "FAILED TO PLACE BUY ORDER");
        }
        order = (await models_1.Order.findById(r).exec());
        pos = true;
    }
    if (order && pos && entry) {
        let exitLimit = 0;
        const e = Math.max(prevrow.o, prevrow.c);
        const T = 3;
        exitLimit = e * (1 + T / 100);
        const _sell = !isGreen && prevrow.c >= o;
        let isSl = false, is_market = false;
        const SL = 4.5, TRAIL = 0.1;
        const isO = prevrow.h == Math.max(prevrow.c, prevrow.o);
        let exit = 0;
        isSl = !isGreen;
        const trail = (0, functions_1.ceil)(prevrow.h * (1 - TRAIL / 100), pxPr);
        const _sl = entry * (1 - SL / 100);
        const minTP = entry * (1 + 0.1 / 100);
        if (o >= trail || o > minTP) {
            exit = o;
            is_market = true;
            isSl = false;
        }
        else {
            exit = exitLimit;
        }
        const amt = (0, functions_1.toFixed)((0, funcs2_1.getBaseToSell)(order), basePr);
        (0, functions_1.botLog)(bot, { isSl, exit, trail, _sl, base: amt });
        if (exit != 0 && (isSl || exit >= _sl)) {
            if (is_market) {
                (0, functions_1.botLog)(bot, "PLACING MARKET SELL AT OPEN");
                const r = await (0, funcs_1.placeTrade)({
                    bot: bot,
                    ts,
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: exit,
                    ordType: "Market",
                });
                if (!r) {
                    return (0, functions_1.botLog)(bot, "COULD NOT PLACE SELL ORDER");
                }
                (0, functions_1.botLog)(bot, "SELL ORDER PLACED");
            }
            else {
                (0, functions_1.botLog)(bot, "PLACING LIMIT SELL AT EXIT_LIMIT");
                const r = await (0, funcs_1.placeTrade)({
                    bot: bot,
                    ts,
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: exit,
                    ordType: "Limit",
                });
                if (!r) {
                    return (0, functions_1.botLog)(bot, "COULD NOT PLACE SELL ORDER");
                }
                (0, functions_1.botLog)(bot, "SELL ORDER PLACED");
            }
        }
    }
};
exports.prodStrategy = prodStrategy;
/*
export const prodStrategy = async ({pos, order, bot}: {order?: IOrder | null, bot: IBot, pos: boolean, row: ICandle, prevrow: ICandle}) =>{
    botLog(bot, prodStrategy)
}
 */
