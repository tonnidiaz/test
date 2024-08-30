import { IBot } from "@/models/bot";
import {
    botLog,
    getCoinPrecision,
    getMinAmt,
    getMinSz,
    getPricePrecision,
} from "../functions";
import { objPlats } from "../consts2";
import {
    getAmtToBuyWith,
    getExactDate,
    getLastOrder,
    orderHasPos,
    parseDate,
    parseKlines,
} from "../funcs2";
import { placeTrade } from "./funcs";
import { Bot, Order } from "@/models";
import mongoose from "mongoose";


export const afterOrderUpdateArbit = async ({ bot }: { bot: IBot }) => {
    try {
        const platName = bot.platform.toLowerCase();

        const _botA = await Bot.findById(bot.children[0]).exec();
        const _botB = await Bot.findById(bot.children[1]).exec();
        const _botC = await Bot.findById(bot.children[2]).exec();

        if (!_botA || !_botB || !_botC) {
            return botLog(bot, "ONE OF THE CHILD BOTS IS MISSING", {
                A: bot.children[0],
                B: bot.children[1],
                C: bot.children[2],
            });
        }
        const pairA = [_botA.base, _botA.ccy],
            pairB = [_botB.base, _botB.ccy],
            pairC = [_botC.base, _botC.ccy];

        const platA = new objPlats[_botA.platform](_botA);
        const platB = new objPlats[_botB.platform](_botB);
        const platC = new objPlats[_botC.platform](_botC);

        const pxPrA = getPricePrecision(pairA, platName);
        const basePrA = getCoinPrecision(pairA, "limit", platName);

        const pxPrB = getPricePrecision(pairB, platName);
        const basePrB = getCoinPrecision(pairB, "limit", platName);

        const pxPrC = getPricePrecision(pairC, platName);
        const basePrC = getCoinPrecision(pairC, "limit", platName);

        const minAmtA = getMinAmt(pairA, platName),
            minSzA = getMinSz(pairA, platName);
        const minAmtB = getMinAmt(pairB, platName),
            minSzB = getMinSz(pairB, platName);
        const minAmtC = getMinAmt(pairC, platName),
            minSzC = getMinSz(pairC, platName);

        if (
            pxPrA == null ||
            basePrA == null ||
            pxPrB == null ||
            basePrB == null ||
            pxPrC == null ||
            basePrC == null ||
            minAmtA == null ||
            minSzA == null ||
            minAmtB == null ||
            minSzB == null ||
            minAmtC == null ||
            minSzC == null
        ) {
            return botLog(
                bot,
                "CANNOT GET PRECISION OR MIN/MAX AMT/SZ FOR ONE OF THE PAIRS"
            );
        }

        botLog(bot, "GETTING KLINES FOR EACH PAIR...\n");
        const end = getExactDate(bot.interval);

        const ksA = await platA.getKlines({ end: end.getTime() });
        if (!ksA) {
            return botLog(bot, "FAILED TO GET KLINES FOR", pairA);
        }
        const ksB = await platB.getKlines({ end: end.getTime() });
        if (!ksB) {
            return botLog(bot, "FAILED TO GET KLINES FOR", pairB);
        }
        const ksC = await platC.getKlines({ end: end.getTime() });
        if (!ksC) {
            return botLog(bot, "FAILED TO GET KLINES FOR", pairC);
        }
        botLog(bot, "GOT ALL KLINES");
        if (!ksA.length || !ksB.length || !ksC.length) {
            return botLog(bot, "ONE OF THE KLINES IS EMPTY", {
                a: ksA.length,
                b: ksB.length,
                c: ksC.length,
            });
        }

        let dfA = parseKlines(ksA);
        let dfB = parseKlines(ksB);
        let dfC = parseKlines(ksC);

        const rowA = dfA[dfA.length - 1];
        const rowB = dfB[dfB.length - 1];
        const rowC = dfC[dfC.length - 1];

        const prev_rowA = dfA[dfA.length - 2];
        const prev_rowB = dfB[dfB.length - 2];
        const prev_rowC = dfC[dfC.length - 2];

        const pxA = rowA.o;
        const pxB = rowB.o;
        const pxC = rowC.o;

        const cPxA = prev_rowA.c;
        const cPxB = prev_rowB.c;
        const cPxC = prev_rowC.c;

        const _isGreenA = prev_rowA.c >= prev_rowA.o;
        const _isGreenB = prev_rowB.c >= prev_rowB.o;
        const _isGreenC = prev_rowC.c >= prev_rowC.o;

        const ts = rowA.ts;

        if (rowB.ts != ts || rowC.ts != ts) {
            return botLog(bot, "TIMESTAMPS DO NOT MATCH");
        }
        console.log("\n", { ts });
        botLog(bot, { pairA, pairB, pairC });
        const mustEnter = (!_isGreenA && _isGreenC) || _isGreenB;

        let _quote = 0,
            baseA = 0,
            baseB = 0;
        let perc = 0;

        const AMT = 1;
        baseA = AMT / cPxA//pxA;
        baseB = baseA / cPxB//pxB;
        _quote = baseB * cPxC//pxC;

        perc = Number((((_quote - AMT) / AMT) * 100).toFixed(2));
        botLog(bot, { prev_ts: prev_rowA.ts });
        botLog(bot, { cPxA, cPxB, cPxC });
        botLog(bot, { pxA, pxB, pxC });

        botLog(bot, { _isGreenA, _isGreenB, _isGreenC });
        botLog(bot, { perc: `${perc}%`, mustEnter }, "\n");
        botLog(bot, { baseA, baseB, _quote });

        if (perc >= bot.min_arbit_perc && mustEnter) {
            botLog(bot, "GOING IN...");

            // botC is the SELL bot
            let order = await getLastOrder(_botC);
            let pos = orderHasPos(order);

            const bal = getAmtToBuyWith(_botC, order);
            baseA = bal / pxA;
            if (baseA < minSzA || bal < minAmtA) {
                botLog(bot, "CANNOT BUY A: LESS THAN MIN_AMT", {
                    baseA,
                    minSzA,
                    amtA: bal,
                    minAmtA,
                });
                return;
            }

            baseB = baseA / pxB;
            if (baseB < minSzB || baseA < minAmtB) {
                botLog(bot, "CANNOT BUY B: LESS THAN MIN_AMT", {
                    baseB,
                    minSzB,
                    amtB: baseA,
                    minAmtB,
                });
                return;
            }

            _quote = baseB * pxC;
            if (baseB < minSzC || _quote < minAmtC) {
                botLog(bot, "CANNOT SELL C: LESS THAN MIN_AMT", {
                    baseC: baseB,
                    minSzC,
                    amtC: _quote,
                    minAmtC,
                });
                return;
            }

            const ts = parseDate(new Date());

            const resA = await placeTrade({
                amt: bal,
                ordType: "Market",
                price: pxA,
                pair: pairA,
                bot: _botA,
                plat: platA,
                side: "buy",
                ts,
            });

            if (!resA)
                return botLog(bot, "Failed to place BUY order for: [A]", pairA);
            const orderA = await getLastOrder(_botA);
            if (!orderA) return botLog(bot, "Failed to get orderA");
            orderA.side = "buy";
            orderA.is_closed = true;
            await orderA.save();
            // The base from A becomes the Quote for B
            const amtB = orderA.base_amt - Math.abs(orderA.buy_fee);
            const resB = await placeTrade({
                amt: amtB,
                ordType: "Market",
                price: pxB,
                pair: pairB,
                bot: _botB,
                plat: platB,
                side: "buy",
                ts,
            });

            if (!resB)
                return botLog(bot, "Failed to place BUY order for: [B]", pairB);
            const orderB = await getLastOrder(_botB);

            if (!orderB) return botLog(bot, "Failed to get orderB");
            orderB.side = "buy";
            orderB.is_closed = true;
            await orderB.save();

            // Sell base_amt from B At C to get A back
            const amtC = orderB.base_amt - Math.abs(orderB.buy_fee);
            const resC = await placeTrade({
                amt: amtC,
                ordType: "Market",
                price: pxC,
                pair: pairC,
                bot: _botC,
                plat: platC,
                side: "sell",
                ts,
            });

            if (!resC)
                return botLog(
                    bot,
                    "Failed to place SELL order for: [C]",
                    pairC
                );

            const orderC = await getLastOrder(_botC);

            if (!orderC) return botLog(bot, "Failed to get order C");
            orderC.side = "sell";
            orderC.is_closed = true;
            orderC.ccy_amt = bal;

            orderC.est_profit = perc;
            const currAmt = orderC.new_ccy_amt - Math.abs(orderC.sell_fee);
            let profit = ((currAmt - orderC.ccy_amt) / orderC.ccy_amt) * 100;
            profit = Number(profit.toFixed(2));
            orderC.profit = profit;
            await orderC.save();
            bot.arbit_orders.push({a: orderA.id, b: orderB.id, c: orderC.id});
            await bot.save();
            botLog(bot, "ALL ORDERS PLACED SUCCESSFULLY!!");
            return bot.id
        }
    } catch (e) {
        botLog(bot, e);
    }
};
