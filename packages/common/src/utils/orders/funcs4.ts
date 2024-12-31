import { IBot } from "@cmn/models/bot";
import { getLastOrder } from "../funcs2";
import {
    parseDate,
    getCoinPrecision,
    getMinAmt,
    getMinSz,
    getPricePrecision,
    sleep,
    toFixed,
} from "../functions";
import { placeTrade } from "./funcs";
import { Bot, TuOrder, TriArbitOrder } from "@cmn/models";
import { objPlats } from "../consts2";
import { updateBuyOrder } from "./funcs2";
import { botLog } from "@cmn/utils/bend/functions";
import { DEV } from "../constants";

const SLEEP_MS = 500;

export const placeArbitOrders = async ({
    bot,
    pairA,
    pairB,
    pairC,
    perc,
    cPxA,
    cPxB,
    cPxC,
}: {
    bot: IBot;
    perc: number;

    cPxA: number;
    cPxB: number;
    cPxC: number;
    pairA: string[];
    pairB: string[];
    pairC: string[];
}) => {
    botLog(bot, "PLACING NORMAL ORDERS...\n");
    if (DEV)
        botLog(bot, {pairA, pairB, pairC})

    const isSuperMega = bot.arbit_settings.super_mega
    const _botA = isSuperMega ? bot : await Bot.findById(bot.children[0]).exec();
    const _botB = isSuperMega ? bot : await Bot.findById(bot.children[1]).exec();
    const _botC = isSuperMega ? bot : await Bot.findById(bot.children[2]).exec();

    if (!_botA || !_botB || !_botC) {
        return botLog(bot, "ONE OF THE CHILD BOTS IS MISSING", {
            A: bot.children[0],
            B: bot.children[1],
            C: bot.children[2],
        });
    }

    const baseA = pairA[0], quoteA = pairA[1]
    const baseB = pairB[0], quoteB = pairB[1]
    const baseC = pairC[0], quoteC = pairC[1]

    const platA = new objPlats[_botA.platform](_botA, pairA);
    const platB = new objPlats[_botB.platform](_botB, pairB);
    const platC = new objPlats[_botC.platform](_botC, pairC);

    const { platform } = bot;

    const pxPrA = getPricePrecision(pairA, platform);
    const basePrA = getCoinPrecision(pairA, "limit", platform);

    const pxPrB = getPricePrecision(pairB, platform);
    const basePrB = getCoinPrecision(pairB, "limit", platform);

    const pxPrC = getPricePrecision(pairC, platform);
    const basePrC = getCoinPrecision(pairC, "limit", platform);

    const minAmtA = getMinAmt(pairA, platform),
        minSzA = getMinSz(pairA, platform);
    const minAmtB = getMinAmt(pairB, platform),
        minSzB = getMinSz(pairB, platform);
    const minAmtC = getMinAmt(pairC, platform),
        minSzC = getMinSz(pairC, platform);

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
    
    
    const A = pairA[1], B = pairB[1], C = pairC[0];
    if (bot.balCcy != A)
        return botLog(bot, "BAL_ERROR:", { last: bot.balCcy, A });

    let bal = bot.balance;
    bal = toFixed(bal, pxPrA);
    const ts = parseDate(new Date());
    let _base = 0,
        _amt = 0;
    _amt = bal;
    _base = bal / cPxA;

    const MAKER = 0.1 / 100,
        TAKER = 0.1 / 100;

    botLog(bot, pairA);
    botLog(bot, { _amt, _base, minAmtA, minSzA });
    if (_amt < minAmtA || _base < minSzA) {
        return botLog(bot, "LESS_ERROR: UNABLE TO PLACE BUY ORDER FOR A");
    }

    _amt = toFixed((_base *= 1 - TAKER), pxPrB);
    _base = _amt / cPxB;

    botLog(bot, pairB);
    botLog(bot, { _amt, _base, minAmtB, minSzB });
    if (_amt < minAmtB || _base < minSzB) {
        return botLog(bot, "LESS_ERROR: UNABLE TO PLACE BUY ORDER FOR B");
    }

    _base = toFixed((_base *= 1 - TAKER), basePrC);
    _amt = _base * cPxC;

    botLog(bot, pairC);
    botLog(bot, { _amt, _base, minAmtC, minSzC });
    if (_amt < minAmtC || _base < minSzC) {
        return botLog(bot, "LESS_ERROR: UNABLE TO PLACE SELL ORDER AT C");
    }

    const arbitOrder = new TriArbitOrder({ bot: bot.id });
    let aord: typeof arbitOrder.order;

    // amt = USDT
    const resA = await placeTrade({
        amt: bal,
        ordType: "Market",
        price: cPxA,
        pair: pairA,
        bot: _botA,
        plat: platA,
        side: "buy",
        ts,
        is_child: true
    });

    if (!resA) return botLog(bot, "Failed to place BUY order for: [A]", pairA);
    const orderA = await getLastOrder(_botA, pairA);
    if (!orderA) return botLog(bot, "Failed to get orderA");
    orderA.side = "buy";
    orderA.is_closed = true;
    await orderA.save();
    aord = { ...aord, a: orderA.id };
    arbitOrder.order = aord;
    await arbitOrder.save();
    await sleep(SLEEP_MS);

    // The base from A becomes the Quote for B
    // amtB = USDC [QUOTE]
    let amtB = orderA.base_amt - Math.abs(orderA.buy_fee);
    amtB = toFixed(amtB, pxPrB);
    const resB = await placeTrade({
        amt: amtB,
        ordType: "Market",
        price: cPxB,
        pair: pairB,
        bot: _botB,
        plat: platB,
        side: "buy",
        ts,
        is_child: true
    });

    if (!resB) return botLog(bot, "Failed to place BUY order for: [B]", pairB);
    const orderB = await getLastOrder(_botB, pairB);

    if (!orderB) return botLog(bot, "Failed to get orderB");
    orderB.side = "buy";
    orderB.is_closed = true;
    await orderB.save();
    aord = { ...aord, b: orderB.id };
    arbitOrder.order = aord;
    await arbitOrder.save();
    await sleep(SLEEP_MS);

    // Sell base_amt from B At C to get A back
    // Sell C(BASE)
    let amtC = orderB.base_amt - Math.abs(orderB.buy_fee);
    amtC = toFixed(amtC, basePrC);
    const resC = await placeTrade({
        amt: amtC,
        ordType: "Market",
        price: cPxC,
        pair: pairC,
        bot: _botC,
        plat: platC,
        side: "sell",
        ts,
        is_child: true
    });

    if (!resC) return botLog(bot, "Failed to place SELL order for: [C]", pairC);

    const orderC = await getLastOrder(_botC, pairC);

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
    aord = { ...aord, c: orderC.id };
    arbitOrder.order = aord;
    await arbitOrder.save();
    await bot.save();
    return bot.id;
};

export const placeArbitOrdersFlipped = async ({
    bot,
    pairA,
    pairB,
    pairC,
    perc,
    cPxA,
    cPxB,
    cPxC,
}: {
    bot: IBot;
    perc: number;

    cPxA: number;
    cPxB: number;
    cPxC: number;
    pairA: string[];
    pairB: string[];
    pairC: string[];
}) => {
    botLog(bot, "PLACING FLIPPED ORDERS...\n");
if (DEV)
        botLog(bot, {pairA, pairB, pairC})
    const isSuperMega = bot.arbit_settings.super_mega;

    const _botA = isSuperMega ? bot : await Bot.findById(bot.children[0]).exec();
    const _botB = isSuperMega ? bot : await Bot.findById(bot.children[1]).exec();
    const _botC = isSuperMega ? bot : await Bot.findById(bot.children[2]).exec();

    if (!_botA || !_botB || !_botC) {
        return botLog(bot, "ONE OF THE CHILD BOTS IS MISSING", {
            A: bot.children[0],
            B: bot.children[1],
            C: bot.children[2],
        });
    }

    const platA = new objPlats[_botA.platform](_botA, pairA);
    const platB = new objPlats[_botB.platform](_botB, pairB);
    const platC = new objPlats[_botC.platform](_botC, pairC);

    const { platform } = bot;

    const pxPrA = getPricePrecision(pairA, platform);
    const basePrA = getCoinPrecision(pairA, "limit", platform);

    const pxPrB = getPricePrecision(pairB, platform);
    const basePrB = getCoinPrecision(pairB, "limit", platform);

    const pxPrC = getPricePrecision(pairC, platform);
    const basePrC = getCoinPrecision(pairC, "limit", platform);

    const minAmtA = getMinAmt(pairA, platform),
        minSzA = getMinSz(pairA, platform);
    const minAmtB = getMinAmt(pairB, platform),
        minSzB = getMinSz(pairB, platform);
    const minAmtC = getMinAmt(pairC, platform),
        minSzC = getMinSz(pairC, platform);

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


    let bal = bot.balance;
    if (bot.balCcy != _botC.ccy)
        return botLog(bot, "BAL_ERROR:", { last: bot.balCcy, bot: _botC.ccy });

    bal = toFixed(bal, pxPrC);
    const ts = parseDate(new Date());

    let _base = 0,
        _amt = 0;
    _amt = bal;
    _base = bal / cPxC; // FLIPPED: FIRST BUY AT C
    const TAKER = 0.1 / 100,
        MAKER = 0.1 / 100;

    botLog(bot, pairC);
    botLog(bot, { _amt, _base, minAmtC, minSzC });
    if (_amt < minAmtC || _base < minSzC) {
        return botLog(bot, "LESS_ERROR: UNABLE TO PLACE BUY ORDER AT C");
    }

    _base = toFixed((_base *= 1 - TAKER), basePrB);
    _amt = _base * cPxB;
    botLog(bot, pairB);
    botLog(bot, { _amt, _base, minAmtB, minSzB });
    if (_amt < minAmtB || _base < minSzB) {
        return botLog(bot, "LESS_ERROR: UNABLE TO PLACE SELL ORDER AT B");
    }

    _base = toFixed((_amt *= 1 - MAKER), basePrA);
    _amt = _base * cPxA;

    botLog(bot, pairA);
    botLog(bot, { _amt, _base, minAmtA, minSzA });
    if (_amt < minAmtA || _base < minSzA) {
        return botLog(bot, "LESS_ERROR: UNABLE TO PLACE SELL ORDER AT A");
    }

    let now = Date.now();
    const arbitOrder = new TriArbitOrder({ bot: bot.id });
    let aord: typeof arbitOrder.order;
    // BUY C [APEX] at C
    const resC = await placeTrade({
        amt: bal,
        ordType: "Market",
        price: cPxC,
        pair: pairC,
        bot,
        plat: platC,
        side: "buy",
        ts,
        is_child: true
    });

    if (!resC) return botLog(bot, "Failed to place BUY order for: [C]", pairC);

    const orderC = await getLastOrder(_botC, pairC)
    if (!orderC) return botLog(bot, "Failed to get orderC");

    // CREATE FAKE ORDER
    
    // const orderC = new TuOrder({
    //     _entry: cPxC,
    //     buy_timestamp: { i: ts, o: parseDate(Date.now()) },
    //     side: "buy",
    //     bot: _botC.id,
    //     base: _botC.base,
    //     ccy: _botC.ccy,
    //     ccy_amt: bal,
    //     base_amt: 0,
    //     is_arbit: true,
    // });
    const _b = bal / cPxC;
    const _fee = (_b * 0.1) / 100;
    now = Date.now();
    await updateBuyOrder(orderC, {
        fillPx: cPxC,
        fillSz: toFixed(_b, basePrC),
        fee: _fee,
        id: `order__${now}`,
        cTime: Date.parse(ts),
        fillTime: now,
    });
    orderC.side = "buy";
    orderC.is_closed = true;

    await orderC.save();
    aord = { ...aord, a: orderC.id };
    arbitOrder.order = aord;
    await arbitOrder.save();

    await sleep(SLEEP_MS);
    // SELL C [APEX] FOR B [USDC] at B
    let amtB = orderC.base_amt - Math.abs(orderC.buy_fee);
    amtB = toFixed(amtB, basePrB);
    const resB = await placeTrade({
        amt: amtB,
        ordType: "Market",
        price: cPxB,
        pair: pairB,
        bot: _botB,
        plat: platB,
        side: "sell",
        ts,
        is_child: true
    });

    if (!resB) return botLog(bot, "Failed to place SELL order for: [B]", pairB);
    const orderB = await getLastOrder(_botB, pairB);

    if (!orderB) return botLog(bot, "Failed to get orderB");
    orderB.side = "sell";
    orderB.is_closed = true;
    await orderB.save();
    aord = { ...aord, b: orderB.id };
    arbitOrder.order = aord;
    await arbitOrder.save();

    await sleep(SLEEP_MS);
    // Sell B [USDC] at A
    let amtA = orderB.new_ccy_amt - Math.abs(orderB.sell_fee);
    amtA = toFixed(amtA, basePrA);
    const resA = await placeTrade({
        amt: amtA,
        ordType: "Market",
        price: cPxA,
        pair: pairA,
        bot: _botA,
        plat: platA,
        side: "sell",
        ts,
        is_child: true
    });

    if (!resA) return botLog(bot, "Failed to place SELL order for: [A]", pairA);

    const orderA = await getLastOrder(_botA, pairA);

    if (!orderA) return botLog(bot, "Failed to get order A");
    orderA.side = "sell";
    orderA.is_closed = true;
    orderA.ccy_amt = bal;

    orderA.est_profit = perc;
    const currAmt = orderA.new_ccy_amt - Math.abs(orderA.sell_fee);
    let profit = ((currAmt - orderA.ccy_amt) / orderA.ccy_amt) * 100;
    profit = Number(profit.toFixed(2));
    orderA.profit = profit;

    aord = { ...aord, c: orderA.id };
    arbitOrder.order = aord;
    await arbitOrder.save();
    await orderA.save();

    await bot.save();
    return bot.id;
};
