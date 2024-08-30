import { Bybit } from "@/classes/bybit";
import { OKX } from "@/classes/okx";
import { IBot } from "@/models/bot";
import { parseDate, getLastOrder } from "../funcs2";
import { botLog } from "../functions";
import { placeTrade } from "./funcs";

export const placeArbitOrders = async ({
    bot,
    bal,
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
}: {
    bot: IBot;
    _botA: IBot;
    _botB: IBot;
    _botC: IBot;
    platA: OKX | Bybit;
    platB: OKX | Bybit;
    platC: OKX | Bybit;

    bal: number;
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
}) => {
    botLog(bot, "PLACING NORMAL ORDERS...\n")

    const ts = parseDate(new Date());

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

    return bot.id
};

export const placeArbitOrdersFlipped = async ({
    bot,
    bal,
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
}: {
    bot: IBot;
    _botA: IBot;
    _botB: IBot;
    _botC: IBot;
    platA: OKX | Bybit;
    platB: OKX | Bybit;
    platC: OKX | Bybit;

    bal: number;
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
}) => {
    botLog(bot, "PLACING FLIPPED ORDERS...\n")


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

    return bot.id
};