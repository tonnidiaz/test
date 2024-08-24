"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const binance_instrus_1 = require("@/utils/data/instrus/binance-instrus");
const bitget_instrus_1 = require("@/utils/data/instrus/bitget-instrus");
const gateio_instrus_1 = require("@/utils/data/instrus/gateio-instrus");
const okx_instrus_1 = require("@/utils/data/instrus/okx-instrus");
const bybit_instrus_1 = require("@/utils/data/instrus/bybit-instrus");
const funcs2_1 = require("@/utils/funcs2");
const functions_1 = require("@/utils/functions");
const mexc_instrus_1 = require("@/utils/data/instrus/mexc-instrus");
const models_1 = require("@/models");
const consts2_1 = require("@/utils/consts2");
const _gateioInstrus = gateio_instrus_1.gateioInstrus.filter((el) => el.trade_status == "tradable").length;
const _bitgetInstrus = bitget_instrus_1.bitgetInstrus.filter((el) => el.status == "online").length;
const _okxInstrus = okx_instrus_1.okxInstrus.filter((el) => el.state == "live").length;
const _binanceInstrus = binance_instrus_1.binanceInstrus.filter((el) => el.status == "TRADING" && el.isSpotTradingAllowed).length;
const _mexcInstrus = mexc_instrus_1.mexcInstrus.filter((el) => el.status == "1" && el.isSpotTradingAllowed).length;
const _bybitInstrus = bybit_instrus_1.bybitInstrus.length;
async function fun() {
    const bot = new models_1.Bot({
        name: "TBOT",
        interval: 5,
        base: "VELO",
        ccy: "USDT",
        platform: "bybit",
    });
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
    const bot = new models_1.Bot({
        name: "TBOT",
        interval: 5,
        base: "CLOUD",
        ccy: "USDT",
        platform: "mexc",
    });
    const plat = new consts2_1.objPlats[bot.platform](bot);
    let base = 0, px = 0.082711111, amt = 1.453811111;
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
    amt = (0, functions_1.toFixed)(amt, pxPr);
    console.log({ px, base, amt });
    let r;
    if (get) {
        r = await plat.getOrderbyId(oid); //await plat.cancelOrder({ordId: oid})
        /*
        {
  symbol: 'AMCUSDT',
  orderId: 'C02__454906501123854336049',
  orderListId: -1,
  clientOrderId: '',
  price: '0.1071',
  origQty: '0',
  executedQty: '14.16',
  cummulativeQuoteQty: '1.452816',
  status: 'FILLED',
  timeInForce: '',
  type: 'MARKET',
  side: 'BUY',
  stopPrice: '',
  icebergQty: '',
  time: 1724240397000,
  updateTime: 1724240398000,
  isWorking: true,
  origQuoteOrderQty: '1.4538'
}
{
  id: 'C02__454906501123854336049',
  fillPx: 0.1071,
  fillSz: 14.16,
  fee: 0,
  fillTime: 1724240398000,
  cTime: 1724240397000
}
        */
    }
    else {
        amt = 9.73; //BASE
        px = 0.1028;
        r = await plat.placeOrder(amt, px, "sell");
    }
    console.log(r);
}
//place({get: false});
async function klines() {
    const bot = new models_1.Bot({
        name: "TBOT",
        interval: 5,
        base: "CLOUD",
        ccy: "USDT",
        platform: "mexc",
    });
    const plat = new consts2_1.objPlats[bot.platform](bot);
    const r = await plat.getTicker(); //getKlines({end: Date.parse("2024-08-22 02:10:00+02:00")})
    console.log(r);
    return;
    const df = (0, funcs2_1.parseKlines)(r ?? []);
    console.log(df[df.length - 1].ts);
}
//klines()
place({ get: true, oid: "C02__455212287674880000049" });
/*
BUY

{
  symbol: 'CLOUDUSDT',
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
//# sourceMappingURL=test.js.map