import { IBot } from "@cmn/models/bot";
import {
    botLog,
    getCoinPrecision,
    getMinAmt,
    getMinSz,
    getPricePrecision,
} from "../functions";
import { objPlats } from "../consts2";
import {
    getExactDate,
    parseKlines,
} from "../funcs2";
import { Bot } from "@cmn/models";
import { placeArbitOrders, placeArbitOrdersFlipped } from "./funcs4";

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

        const oPxA = prev_rowA.o;
        const oPxB = prev_rowB.o;
        const oPxC = prev_rowC.o;

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
        baseA = AMT / cPxA; //pxA;
        baseB = baseA / cPxB; //pxB;
        _quote = baseB * cPxC; //pxC;

        const { arbit_settings } = bot;

        if (!arbit_settings) return;

        let oA = 0,
            cA = 0,
            oB = 0,
            cB = 0,
            oC = 0,
            cC = 0;

        // if (arbit_settings.flipped) {
        //     oC = AMT / oPxC;
        //     oB = oC * oPxB;
        //     oA = oB * oPxA;

        //     cC = AMT / cPxC;
        //     cB = cC * cPxB;
        //     cA = cB * cPxA;
        // } else {
        //     cB = AMT / cPxA; //  BUY B WITH A
        //     cC = cB / cPxB; // BUY C WITH B
        //     cA = cC * cPxC; // SELL C FOR A

        //     oB = AMT / oPxA; //  BUY B WITH A
        //     oC = oB / oPxB; // BUY C WITH B
        //     oA = oC * oPxC; // SELL C FOR A
        //     // 242.660

        //     //console.log({ AMT, _A, perc });
        // }
        const o_perc = Number((((oA - AMT) / AMT) * 100).toFixed(2));
        const c_perc = Number((((cA - AMT) / AMT) * 100).toFixed(2));
        

        perc = Math.abs(c_perc)
        const percCond = perc >= arbit_settings.min_perc;
        const flipped = c_perc < 0
        botLog(bot, { prev_ts: prev_rowA.ts });
        botLog(bot, { cPxA, cPxB, cPxC });
        botLog(bot, { pxA, pxB, pxC });

        botLog(bot, { _isGreenA, _isGreenB, _isGreenC });
        botLog(bot, { perc: `${perc}%`, flipped }, "\n");
        botLog(bot, { baseA, baseB, _quote });
        const MAKER = 0.1 / 100,
            TAKER = 0.1 / 100;

        if (percCond) {
            botLog(bot, "GOING IN...");
          
            const params = {
                bot,
                pairA,
                pairB,
                pairC,
                platA,
                platB,
                platC,
                _botA,
                _botB,
                _botC,
                perc,
                cPxA,
                cPxB,
                cPxC,

                minAmtA,
                minAmtB,
                minAmtC,

                minSzA,
                minSzB,
                minSzC,
                MAKER,
                TAKER,
                basePrA,
                pxPrA,
                basePrB,
                pxPrB,
                basePrC,
                pxPrC,
            };

            let res: any = null;
            /* PLACE ORDERS */
            if (flipped) {
                res = await placeArbitOrdersFlipped(params);
            } else {
                res = await placeArbitOrders(params);
            }
            /* END PLACE ORDERS */
            await bot.save();
            if (!res) return botLog(bot, "FAILED TO PLACE ORDERS");
            botLog(bot, "ALL ORDERS PLACED SUCCESSFULLY!!");
        }
        return bot.id;
    } catch (e) {
        botLog(bot, e);
    }
};
