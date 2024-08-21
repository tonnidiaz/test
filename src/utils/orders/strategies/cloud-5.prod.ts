/**
 * WORKS BEST WITH THE 30min TIMEFRAME
 */

import { IBot } from "@/models/bot";
import { IOrder } from "@/models/order";
import {
    getAmtToBuyWith,
    getBaseToSell,
    getBotPlat,
    getBotStrategy,
} from "@/utils/funcs2";
import { botLog, ceil, toFixed } from "@/utils/functions";
import { ICandle } from "@/utils/interfaces";
import { placeTrade } from "../funcs";
import { Order } from "@/models";

export const cloud5Prod = async ({
    pos,
    order,
    bot,
    row,
    prevrow,
    pxPr,
    basePr,
}: {
    order?: IOrder | null;
    bot: IBot;
    pos: boolean;
    row: ICandle;
    prevrow: ICandle;
    pxPr: number;
    basePr: number;
}) => {
    botLog(bot, cloud5Prod);

    const plat = getBotPlat(bot);
    const str = getBotStrategy(bot);
    

    let isSl = false,
            is_market = false;
    const { ts, o, h, l, c } = row;
    const isGreen = prevrow.c >= prevrow.o;
    let entry = order?._entry;
    const TRAIL = 0.1;
        
    
    const trail = ceil(prevrow.h * (1 - TRAIL / 100), pxPr);
    botLog(bot, { str, pos, trail, o });

    if (!pos && str.buyCond(prevrow)) {
        botLog(bot, "KAYA RA BUY");

        const amt = getAmtToBuyWith(bot, order);
        entry = o;
        if (o < trail){
           const r = await placeTrade({
            bot: bot,
            ts,
            amt,
            side: "buy",
            price: entry,
            plat: plat,
            ordType: "Market",
        });
        if (!r) {
            return botLog(bot, "FAILED TO PLACE BUY ORDER");
        } 
        order = (await Order.findById(r).exec())!;
        pos = true;
        }else{
            botLog(bot, "NOT PLACING BUY , OPEN >= TRAIL")
        }
        

        
    }

    if (order && pos && entry) {
        let exitLimit = 0;

        const e = Math.max(prevrow.o, prevrow.c);
        const T = 1.5, SL = 2.5
        exitLimit = e * (1 + T/ 100);
        
        let exit = 0;
        const isO = prevrow.h == Math.max(prevrow.c, prevrow.o);
        isSl = true//!isGreen;
        const _sl = entry * (1 - SL / 100);
        const minTP = entry * (1 + 0.1 / 100);
        const openCond = (o >= trail && isO) || o > minTP;
        if (openCond ) {
            exit = o;
            is_market = true;
            //isSl = false
        } else {
            exit = exitLimit;
        }

        const amt = toFixed(getBaseToSell(order), basePr);
        botLog(bot, { isSl, exit, trail, _sl, base: amt });

        if (exit != 0 && (isSl || exit >= _sl)) {
            if (is_market) {
                botLog(bot, "PLACING MARKET SELL AT OPEN");
                const r = await placeTrade({
                    bot: bot,
                    ts,
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: exit,
                    ordType: "Market",
                });

                if (!r) {
                    return botLog(bot, "COULD NOT PLACE SELL ORDER");
                }
                botLog(bot, "SELL ORDER PLACED");
            } else {
                botLog(bot, "PLACING LIMIT SELL AT EXIT_LIMIT");

                const r = await placeTrade({
                    bot: bot,
                    ts,
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: exit,
                    ordType: "Limit",
                });

                if (!r) {
                    return botLog(bot, "COULD NOT PLACE SELL ORDER");
                }
                botLog(bot, "SELL ORDER PLACED");
            }
        }
    }
};
/* 
export const prodStrategy = async ({pos, order, bot}: {order?: IOrder | null, bot: IBot, pos: boolean, row: ICandle, prevrow: ICandle}) =>{
    botLog(bot, prodStrategy)
}
 */
