import { binanceInstrus } from "@/utils/data/instrus/binance-instrus";
import { bitgetInstrus } from "@/utils/data/instrus/bitget-instrus";
import { gateioInstrus } from "@/utils/data/instrus/gateio-instrus";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { bybitInstrus } from "@/utils/data/instrus/bybit-instrus";
import { parseDate, parseKlines } from "@/utils/funcs2";
import {
    getCoinPrecision,
    getPricePrecision,
    randomNum,
    toFixed,
} from "@/utils/functions";
import { scheduleJob } from "node-schedule";
import { mexcInstrus } from "@/utils/data/instrus/mexc-instrus";
import { Bot } from "@/models";
import { objPlats } from "@/utils/consts2";

const _gateioInstrus = gateioInstrus.filter(
    (el) => el.trade_status == "tradable"
).length;
const _bitgetInstrus = bitgetInstrus.filter(
    (el) => el.status == "online"
).length;
const _okxInstrus = okxInstrus.filter((el) => el.state == "live").length;
const _binanceInstrus = binanceInstrus.filter(
    (el) => el.status == "TRADING" && el.isSpotTradingAllowed
).length;
const _mexcInstrus = mexcInstrus.filter(
    (el) => el.status == "1" && el.isSpotTradingAllowed
).length;
const _bybitInstrus = bybitInstrus.length;

async function fun() {
    const bot = new Bot({
        name: "TBOT",
        interval: 5,
        base: "VELO",
        ccy: "USDT",
        platform: "bybit",
    });
    const plat = new objPlats[bot.platform](bot);
    let base = 405.6858493939392229999999999,
        px = 0.01248643435345435345664564564;

    console.log({ px, base });

    const pair = [bot.base, bot.ccy];
    const basePr = getCoinPrecision(pair, "limit", bot.platform);
    const pxPr = getPricePrecision(pair, bot.platform);
    console.log({ pair, basePr, pxPr });

    if (basePr == null || pxPr == null) return;

    base = toFixed(base, basePr);
    px = toFixed(px, pxPr);
    console.log({ px, base });

    const r = await plat.placeOrder(base, px, "sell");
    console.log(r);
}

async function place({ get = false }: { get?: boolean }) {
    const bot = new Bot({
        name: "TBOT",
        interval: 30,
        base: "AMC",
        ccy: "USDT",
        platform: "mexc",
    });
    const plat = new objPlats[bot.platform](bot);
    let base = 0,
        px = 0.082711111,
        amt = 1.453811111;

    console.log({ px, base, amt });

    const pair = [bot.base, bot.ccy];
    const basePr = getCoinPrecision(pair, "limit", bot.platform);
    /// const qPr = getCoinPrecision(pair,'limit', bot.platform)
    const pxPr = getPricePrecision(pair, bot.platform);
    console.log({ pair, basePr, pxPr });

    if (basePr == null || pxPr == null) return;

    base = toFixed(base, basePr);
    px = toFixed(px, pxPr);
    amt = toFixed(amt, pxPr);
    console.log({ px, base, amt });

    const oid = "C02__454906501123854336049";

    let r: any;

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
    } else {
        amt = 9.73 //BASE
        px = 0.1028
        r = await plat.placeOrder(amt, px, "sell");
    }

    console.log(r);
}

//place({get: false});

async function klines(){
    const bot = new Bot({
        name: "TBOT",
        interval: 5,
        base: "CLOUD",
        ccy: "USDT",
        platform: "mexc",
    });
    const plat = new objPlats[bot.platform](bot);

    const r = await plat.getKlines({end: Date.parse("2024-08-22 01:15:00+02:00")})
    
    const df = parseKlines(r ?? [])
    console.log(df[df.length - 1].ts)
}


klines()