"use strict";
/**
 * WORKS BEST WITH THE 30min TIMEFRAME
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloud5Prod = void 0;
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const funcs_1 = require("../funcs");
const models_1 = require("@/models");
const cloud5Prod = async ({ pos, order, bot, row, prevrow, pxPr, basePr, }) => {
    (0, functions_1.botLog)(bot, exports.cloud5Prod);
    const plat = (0, funcs2_1.getBotPlat)(bot);
    const str = (0, funcs2_1.getBotStrategy)(bot);
    let isSl = false, is_market = false;
    const { ts, o, h, l, c } = row;
    const isGreen = prevrow.c >= prevrow.o;
    let entry = order?._entry;
    const TRAIL = 0.1;
    const isO = prevrow.h == Math.max(prevrow.c, prevrow.o);
    const trail = (0, functions_1.ceil)(prevrow.h * (1 - TRAIL / 100), pxPr);
    (0, functions_1.botLog)(bot, { str, pos, trail, o, isO });
    if (!pos && str.buyCond(prevrow)) {
        (0, functions_1.botLog)(bot, "KAYA RA BUY");
        const amt = (0, funcs2_1.getAmtToBuyWith)(bot, order);
        entry = o;
        if (o < trail) {
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
        else {
            (0, functions_1.botLog)(bot, "NOT PLACING BUY , OPEN >= TRAIL");
        }
    }
    if (order && pos && entry) {
        let exitLimit = 0;
        const e = Math.max(prevrow.o, prevrow.c);
        const T = 1.5, SL = 2.5;
        exitLimit = e * (1 + T / 100);
        let exit = 0;
        isSl = true; //!isGreen;
        const _sl = entry * (1 - SL / 100);
        const minTP = entry * (1 + 0.1 / 100);
        const openCond = (o >= trail && isO) || o > minTP;
        (0, functions_1.botLog)(bot, { openCond, minTP });
        if (openCond) {
            exit = o;
            is_market = true;
            //isSl = false
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
exports.cloud5Prod = cloud5Prod;
/*
export const prodStrategy = async ({pos, order, bot}: {order?: IOrder | null, bot: IBot, pos: boolean, row: ICandle, prevrow: ICandle}) =>{
    botLog(bot, prodStrategy)
}
 */
