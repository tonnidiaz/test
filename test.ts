import { binanceInstrus } from "@/utils/data/instrus/binance-instrus";
import { bitgetInstrus } from "@/utils/data/instrus/bitget-instrus";
import { gateioInstrus } from "@/utils/data/instrus/gateio-instrus";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { bybitInstrus } from "@/utils/data/instrus/bybit-instrus";
import { parseDate } from "@/utils/funcs2";
import { getCoinPrecision, getPricePrecision, randomNum, toFixed } from "@/utils/functions";
import { scheduleJob } from "node-schedule";
import { mexcInstrus } from "@/utils/data/instrus/mexc-instrus";
import { Bot } from "@/models";
import { objPlats } from "@/utils/consts2";

const _gateioInstrus = gateioInstrus.filter(el=> el.trade_status == 'tradable').length
const _bitgetInstrus = bitgetInstrus.filter(el=> el.status == 'online').length
const _okxInstrus = okxInstrus.filter(el=> el.state == 'live').length
const _binanceInstrus = binanceInstrus.filter(el=> el.status == 'TRADING' && el.isSpotTradingAllowed).length
const _mexcInstrus = mexcInstrus.filter(el=> el.status == '1' && el.isSpotTradingAllowed).length
const _bybitInstrus = bybitInstrus.length


const bot = new Bot({name: "TBOT", interval: 5, base: "VELO", ccy: "USDT", platform: "bybit"})

async function fun(){

    const plat = new objPlats[bot.platform](bot)
    let base = 405.6858493939392229999999999, px = 0.01248643435345435345664564564

    console.log({px, base})

    const pair = [bot.base, bot.ccy]
    const basePr = getCoinPrecision(pair,'limit', bot.platform)
    const pxPr = getPricePrecision(pair, bot.platform)
    console.log({pair, basePr, pxPr})

    if (basePr == null || pxPr == null) return

    base = toFixed(base, basePr)
    px = toFixed(px, pxPr)
    console.log({px, base})

    const r = await plat.placeOrder(base, px, "sell")
    console.log(r)
}

fun()