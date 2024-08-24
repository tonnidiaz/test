"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bybit_instrus_1 = require("@/utils/data/instrus/bybit-instrus");
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const models_1 = require("@/models");
const consts2_1 = require("@/utils/consts2");
const _bybitInstrus = bybit_instrus_1.bybitInstrus.length;
const bot = new models_1.Bot({
    name: "TBOT",
    interval: 5,
    base: "AITECH",
    ccy: "USDT",
    platform: "bitget",
});
const plat = new consts2_1.objPlats[bot.platform](bot);
async function fun() {
    const plat = new consts2_1.objPlats[bot.platform](bot);
    let base = 405.6858493939392229999999999, px = 0.01248643435345435345664564564;
    console.log({ px, base });
    const pair = [bot.base, bot.ccy];
    const basePr = (0, functions_1.getCoinPrecision)(pair, "limit", bot.platform);
    const pxPr = (0, functions_1.getPricePrecision)(pair, bot.platform);
    console.log({ pair, basePr, pxPr });
    if (basePr == null || pxPr == null)
        return;
    base = (0, functions_1.toFixed)(base, basePr);
    px = (0, functions_1.toFixed)(px, pxPr);
    console.log({ px, base });
    const r = await plat.placeOrder(base, px, "sell");
    console.log(r);
}
async function place({ get = false, oid = "" }) {
    let base = 0, px = 0.02514011111, amt = 1.2;
    console.log({ px, base, amt });
    const pair = [bot.base, bot.ccy];
    const basePr = (0, functions_1.getCoinPrecision)(pair, "limit", bot.platform);
    /// const qPr = getCoinPrecision(pair,'limit', bot.platform)
    const pxPr = (0, functions_1.getPricePrecision)(pair, bot.platform);
    console.log({ pair, basePr, pxPr });
    if (basePr == null || pxPr == null)
        return;
    base = (0, functions_1.toFixed)(base, basePr);
    px = (0, functions_1.toFixed)(px, pxPr);
    amt = (0, functions_1.toFixed)(amt, basePr);
    console.log({ px, base, amt });
    let r;
    if (get) {
        const cancel = false;
        r = !cancel ? await plat.getOrderbyId(oid) : await plat.cancelOrder({ ordId: oid });
    }
    else {
        amt = (0, functions_1.toFixed)(17.46252, basePr);
        r = await plat.placeOrder(amt, undefined, "sell");
    }
    console.log(r);
}
//place({get: false});
async function klines() {
    try {
        const plat = new consts2_1.objPlats[bot.platform](bot);
        const r = await plat.getKlines({ end: (0, funcs2_1.getExactDate)(bot.interval).getTime() });
        if (!r)
            return;
        const df = (0, funcs2_1.parseKlines)(r ?? []);
        console.log(df[df.length - 1].ts);
    }
    catch (e) {
        console.log(e);
    }
}
klines();
const bitgetId = "1210973572597989379", marketBuy = "1210975861232549892", marketSell = "1210976388569808899";
//place({get: false})
//place({get: true, oid: marketBuy})
/*
BUY

{
  symbol: 'OPTIMUSUSDT',
  orderId: 'C02__455211027953455104049',
  orderListId: -1,
  clientOrderId: '1724313002084',
  price: '0.0007936',
  origQty: '0',
  executedQty: '1817.23',
  cummulativeQuoteQty: '1.399993992',
  status: 'FILLED',
  timeInForce: '',
  type: 'MARKET',
  side: 'BUY',
  stopPrice: '',
  icebergQty: '',
  time: 1724313002000,
  updateTime: 1724313002000,
  isWorking: true,
  origQuoteOrderQty: '1.4'
}
{
  id: 'C02__455211027953455104049',
  fillPx: 0.0007704,
  fillSz: 1817.23,
  fee: 0,
  fillTime: 1724313002000,
  cTime: 1724313002000
}
*/ 
//# sourceMappingURL=test-bitget.js.map