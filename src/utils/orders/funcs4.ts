import { Bybit } from "@/classes/bybit";
import { OKX } from "@/classes/okx";
import { IBot } from "@/models/bot";
import { parseDate, getLastOrder, getAmtToBuyWith } from "../funcs2";
import { botLog, toFixed } from "../functions";
import { placeTrade } from "./funcs";

export const placeArbitOrders = async ({
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
}: {
    bot: IBot;
    _botA: IBot;
    _botB: IBot;
    _botC: IBot;
    platA: OKX | Bybit;
    platB: OKX | Bybit;
    platC: OKX | Bybit;
    perc: number;

    cPxA: number;
    cPxB: number;
    cPxC: number;

    minAmtA: number;
    minAmtB: number;
    minAmtC: number;

    minSzA: number;
    minSzB: number;
    minSzC: number;

    pairA: string[];
    pairB: string[];
    pairC: string[];
    TAKER: number;
    MAKER: number;

    basePrA: number;
    pxPrA: number;
    basePrB: number;
    pxPrB: number;
    basePrC: number;
    pxPrC: number;
}) => {
    botLog(bot, "PLACING NORMAL ORDERS...\n");
    let order = await getLastOrder(_botC);
    const bal = getAmtToBuyWith(_botC, order);
    const ts = parseDate(new Date());
    let _base = 0,
        _amt = 0;
    _amt = bal;
    _base = bal / cPxA;

    botLog(bot, pairA);
    botLog(bot, { _amt, _base, minAmtA, minSzA });
    if (_amt < minAmtA || _base < minSzA) {
        return botLog(bot, "LESS_ERROR; UNABLE TO PLACE BUY ORDER FOR A");
    }

    _amt = toFixed((_base *= 1 - TAKER), basePrA);
    _base = _amt / cPxB;

    botLog(bot, pairB);
    botLog(bot, { _amt, _base, minAmtB, minSzB });
    if (_amt < minAmtB || _base < minSzB) {
        return botLog(bot, "LESS_ERROR; UNABLE TO PLACE BUY ORDER FOR B");
    }

    _base = toFixed((_base *= 1 - TAKER), basePrB);
    _amt = _base * cPxC;

    botLog(bot, pairC);
    botLog(bot, { _amt, _base, minAmtC, minSzC });
    if (_amt < minAmtC || _base < minSzC) {
        return botLog(bot, "LESS_ERROR; UNABLE TO PLACE BUY ORDER FOR C");
    }

    const resA = await placeTrade({
        amt: bal,
        ordType: "Market",
        price: cPxA,
        pair: pairA,
        bot: _botA,
        plat: platA,
        side: "buy",
        ts,
    });

    if (!resA) return botLog(bot, "Failed to place BUY order for: [A]", pairA);
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
        price: cPxB,
        pair: pairB,
        bot: _botB,
        plat: platB,
        side: "buy",
        ts,
    });

    if (!resB) return botLog(bot, "Failed to place BUY order for: [B]", pairB);
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
        price: cPxC,
        pair: pairC,
        bot: _botC,
        plat: platC,
        side: "sell",
        ts,
    });

    if (!resC) return botLog(bot, "Failed to place SELL order for: [C]", pairC);

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
    bot.arbit_orders.push({ a: orderA.id, b: orderB.id, c: orderC.id });

    return bot.id;
};

export const placeArbitOrdersFlipped = async ({
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
}: {
    bot: IBot;
    _botA: IBot;
    _botB: IBot;
    _botC: IBot;
    platA: OKX | Bybit;
    platB: OKX | Bybit;
    platC: OKX | Bybit;

    perc: number;

    cPxA: number;
    cPxB: number;
    cPxC: number;

    minAmtA: number;
    minAmtB: number;
    minAmtC: number;

    minSzA: number;
    minSzB: number;
    minSzC: number;

    pairA: string[];
    pairB: string[];
    pairC: string[];
    TAKER: number;
    MAKER: number;
    basePrA: number;
    pxPrA: number;
    basePrB: number;
    pxPrB: number;
    basePrC: number;
    pxPrC: number;
}) => {
    botLog(bot, "PLACING FLIPPED ORDERS...\n");

    let order = await getLastOrder(_botA);

    const bal = getAmtToBuyWith(_botA, order);

    const ts = parseDate(new Date());

    // BUY C [APEX] at C
    const resC = await placeTrade({
        amt: bal,
        ordType: "Market",
        price: cPxC,
        pair: pairC,
        bot: _botC,
        plat: platC,
        side: "buy",
        ts,
    });

    if (!resC) return botLog(bot, "Failed to place BUY order for: [C]", pairC);

    const orderC = await getLastOrder(_botC);
    if (!orderC) return botLog(bot, "Failed to get orderC");
    orderC.side = "buy";
    orderC.is_closed = true;
    await orderC.save();

    // SELL C [APEX] FOR B [USDC] at B
    const amtB = orderC.base_amt - Math.abs(orderC.buy_fee);
    const resB = await placeTrade({
        amt: amtB,
        ordType: "Market",
        price: cPxB,
        pair: pairB,
        bot: _botB,
        plat: platB,
        side: "sell",
        ts,
    });

    if (!resB) return botLog(bot, "Failed to place SELL order for: [B]", pairB);
    const orderB = await getLastOrder(_botB);

    if (!orderB) return botLog(bot, "Failed to get orderB");
    orderB.side = "sell";
    orderB.is_closed = true;
    await orderB.save();

    // Sell B [USDC] at A
    const amtA = orderB.new_ccy_amt - Math.abs(orderB.sell_fee);
    const resA = await placeTrade({
        amt: amtA,
        ordType: "Market",
        price: cPxA,
        pair: pairA,
        bot: _botA,
        plat: platA,
        side: "sell",
        ts,
    });

    if (!resA) return botLog(bot, "Failed to place SELL order for: [A]", pairA);

    const orderA = await getLastOrder(_botA);

    if (!orderA) return botLog(bot, "Failed to get order A");
    orderA.side = "sell";
    orderA.is_closed = true;
    orderA.ccy_amt = bal;

    orderA.est_profit = perc;
    const currAmt = orderA.new_ccy_amt - Math.abs(orderA.sell_fee);
    let profit = ((currAmt - orderA.ccy_amt) / orderA.ccy_amt) * 100;
    profit = Number(profit.toFixed(2));
    orderA.profit = profit;
    await orderA.save();

    bot.arbit_orders.push({ a: orderC.id, b: orderB.id, c: orderA.id });

    return bot.id;
};
