import { binanceInstrus } from "@/utils/data/instrus/binance-instrus";
import { bitgetInstrus } from "@/utils/data/instrus/bitget-instrus";
import { gateioInstrus } from "@/utils/data/instrus/gateio-instrus";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { bybitInstrus } from "@/utils/data/instrus/bybit-instrus";
import { getExactDate, parseDate, parseKlines } from "@/utils/funcs2";
import {
    getCoinPrecision,
    getPricePrecision,
    randomNum,
    toFixed,
} from "@/utils/functions";
import { scheduleJob } from "node-schedule";
import { Bot } from "@/models";
import { objPlats } from "@/utils/consts2";


const _bybitInstrus = bybitInstrus.length;
const bot = new Bot({
        name: "TBOT",
        interval: 5,
        base: "AITECH",
        ccy: "USDT",
        platform: "bitget",
    });
const plat = new objPlats[bot.platform](bot);

async function fun() {

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

async function place({ get = false, oid="" }: { get?: boolean, oid?: string }) {
 
    
    let base = 0,
        px = 0.02514011111,
        amt = 1.2;

    console.log({ px, base, amt });

    const pair = [bot.base, bot.ccy];
    const basePr = getCoinPrecision(pair, "limit", bot.platform);
    /// const qPr = getCoinPrecision(pair,'limit', bot.platform)
    const pxPr = getPricePrecision(pair, bot.platform);
    console.log({ pair, basePr, pxPr });

    if (basePr == null || pxPr == null) return;

    base = toFixed(base, basePr);
    px = toFixed(px, pxPr);
    amt = toFixed(amt, basePr);
    console.log({ px, base, amt });

    let r: any;

    if (get) {
        const cancel = false
        r = !cancel ? await plat.getOrderbyId(oid) : await plat.cancelOrder({ordId: oid})
    
    } else {
        amt= toFixed(17.46252, basePr)
        r = await plat.placeOrder(amt, undefined, "sell");
    }

    console.log(r);
}

//place({get: false});

async function klines(){
    
    try{
        const plat = new objPlats[bot.platform](bot);

    const r = await plat.getKlines({end: getExactDate(bot.interval).getTime()})    
    if (!r) return
    const df = parseKlines(r ?? [])
    console.log(df[df.length - 1].ts)
    }catch(e){console.log(e);}
    
}


klines()


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