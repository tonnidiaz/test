// import { Bot, TriArbitOrder } from "@cmn/models";
// import { IBot } from "@cmn/models/bot";
// import { botLog } from "../bend/functions";
// import { objPlats } from "../consts2";
// import { getLastOrder } from "../funcs2";
// import { getPricePrecision, getCoinPrecision, getMinAmt, getMinSz, toFixed, parseDate, sleep } from "../functions";
// import { placeTrade } from "./funcs";

// const SLEEP_MS = 500

// export const placeSuperArbitOrders = async ({
//     bot,
//     pairA,
//     pairB,
//     pairC,
//     perc,
//     cPxA,
//     cPxB,
//     cPxC,
// }: {
//     bot: IBot;
//     perc: number;

//     cPxA: number;
//     cPxB: number;
//     cPxC: number;
//     pairA: string[];
//     pairB: string[];
//     pairC: string[];
// }) => {


//     const { platform } = bot;

//     const pxPrA = getPricePrecision(pairA, platform);
//     const basePrA = getCoinPrecision(pairA, "limit", platform);

//     const pxPrB = getPricePrecision(pairB, platform);
//     const basePrB = getCoinPrecision(pairB, "limit", platform);

//     const pxPrC = getPricePrecision(pairC, platform);
//     const basePrC = getCoinPrecision(pairC, "limit", platform);

//     const minAmtA = getMinAmt(pairA, platform),
//         minSzA = getMinSz(pairA, platform);
//     const minAmtB = getMinAmt(pairB, platform),
//         minSzB = getMinSz(pairB, platform);
//     const minAmtC = getMinAmt(pairC, platform),
//         minSzC = getMinSz(pairC, platform);

//     if (
//         pxPrA == null ||
//         basePrA == null ||
//         pxPrB == null ||
//         basePrB == null ||
//         pxPrC == null ||
//         basePrC == null ||
//         minAmtA == null ||
//         minSzA == null ||
//         minAmtB == null ||
//         minSzB == null ||
//         minAmtC == null ||
//         minSzC == null
//     ) {
//         return botLog(
//             bot,
//             "CANNOT GET PRECISION OR MIN/MAX AMT/SZ FOR ONE OF THE PAIRS"
//         );
//     }
//     botLog(bot, "PLACING NORMAL ORDERS...\n");
//     const isSuperMega = bot.arbit_settings.super_mega;

//     const A = pairA[1], B = pairB[1], C = pairC[0];
//     if (bot.balCcy != A)
//         return botLog(bot, "BAL_ERROR:", { last: bot.balCcy, A });

//     let bal = bot.balance;
//     bal = toFixed(bal, pxPrA);
//     const ts = parseDate(new Date());
//     let _base = 0,
//         _amt = 0;
//     _amt = bal;
//     _base = bal / cPxA;

//     const MAKER = 0.1 / 100,
//         TAKER = 0.1 / 100;

//     botLog(bot, pairA);
//     botLog(bot, { _amt, _base, minAmtA, minSzA });
//     if (_amt < minAmtA || _base < minSzA) {
//         return botLog(bot, "LESS_ERROR: UNABLE TO PLACE BUY ORDER FOR A");
//     }

//     _amt = toFixed((_base *= 1 - TAKER), pxPrB);
//     _base = _amt / cPxB;

//     botLog(bot, pairB);
//     botLog(bot, { _amt, _base, minAmtB, minSzB });
//     if (_amt < minAmtB || _base < minSzB) {
//         return botLog(bot, "LESS_ERROR: UNABLE TO PLACE BUY ORDER FOR B");
//     }

//     _base = toFixed((_base *= 1 - TAKER), basePrC);
//     _amt = _base * cPxC;

//     botLog(bot, pairC);
//     botLog(bot, { _amt, _base, minAmtC, minSzC });
//     if (_amt < minAmtC || _base < minSzC) {
//         return botLog(bot, "LESS_ERROR: UNABLE TO PLACE SELL ORDER AT C");
//     }

//     const arbitOrder = new TriArbitOrder({ bot: bot.id, A, B, C });
//     let aord: typeof arbitOrder.order;
//     const resA = await placeTrade({
//         amt: bal,
//         ordType: "Market",
//         price: cPxA,
//         pair: pairA,
//         bot,
//         plat,
//         side: "buy",
//         ts,
//         is_child: true
//     });

//     if (!resA) return botLog(bot, "Failed to place BUY order for: [A]", pairA);
//     const orderA = await getLastOrder(bot);
//     if (!orderA) return botLog(bot, "Failed to get orderA");
//     orderA.side = "buy";
//     orderA.is_closed = true;
//     await orderA.save();
//     aord = { ...aord, a: orderA.id };
//     arbitOrder.order = aord;
//     await arbitOrder.save();
//     await sleep(SLEEP_MS);
//     // The base from A becomes the Quote for B
//     let amtB = orderA.base_amt - Math.abs(orderA.buy_fee);
//     amtB = toFixed(amtB, pxPrB);
//     const resB = await placeTrade({
//         amt: amtB,
//         ordType: "Market",
//         price: cPxB,
//         pair: pairB,
//         bot,
//         plat,
//         side: "buy",
//         ts,
//         is_child: true
//     });

//     if (!resB) return botLog(bot, "Failed to place BUY order for: [B]", pairB);
//     const orderB = await getLastOrder(bot);

//     if (!orderB) return botLog(bot, "Failed to get orderB");
//     orderB.side = "buy";
//     orderB.is_closed = true;
//     await orderB.save();
//     aord = { ...aord, b: orderB.id };
//     arbitOrder.order = aord;
//     await arbitOrder.save();
//     await sleep(SLEEP_MS);
//     // Sell base_amt from B At C to get A back
//     let amtC = orderB.base_amt - Math.abs(orderB.buy_fee);
//     amtC = toFixed(amtC, basePrC);
//     const resC = await placeTrade({
//         amt: amtC,
//         ordType: "Market",
//         price: cPxC,
//         pair: pairC,
//         bot,
//         plat,
//         side: "sell",
//         ts,
//         is_child: true
//     });

//     if (!resC) return botLog(bot, "Failed to place SELL order for: [C]", pairC);

//     const orderC = await getLastOrder(bot);

//     if (!orderC) return botLog(bot, "Failed to get order C");
//     orderC.side = "sell";
//     orderC.is_closed = true;
//     orderC.ccy_amt = bal;

//     orderC.est_profit = perc;
//     const currAmt = orderC.new_ccy_amt - Math.abs(orderC.sell_fee);
//     let profit = ((currAmt - orderC.ccy_amt) / orderC.ccy_amt) * 100;
//     profit = Number(profit.toFixed(2));
//     orderC.profit = profit;
//     await orderC.save();
//     aord = { ...aord, c: orderC.id };
//     arbitOrder.order = aord;
//     await arbitOrder.save();
//     await bot.save();
//     return bot.id;
// };