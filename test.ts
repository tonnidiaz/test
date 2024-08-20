import { binanceInstrus } from "@/utils/data/instrus/binance-instrus";
import { bitgetInstrus } from "@/utils/data/instrus/bitget-instrus";
import { gateioInstrus } from "@/utils/data/instrus/gateio-instrus";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { bybitInstrus } from "@/utils/data/instrus/bybit-instrus";
import { parseDate } from "@/utils/funcs2";
import { getPricePrecision, randomNum } from "@/utils/functions";
import { scheduleJob } from "node-schedule";
import { mexcInstrus } from "@/utils/data/instrus/mexc-instrus";

const _gateioInstrus = gateioInstrus.filter(el=> el.trade_status == 'tradable').length
const _bitgetInstrus = bitgetInstrus.filter(el=> el.status == 'online').length
const _okxInstrus = okxInstrus.filter(el=> el.state == 'live').length
const _binanceInstrus = binanceInstrus.filter(el=> el.status == 'TRADING' && el.isSpotTradingAllowed).length
const _mexcInstrus = mexcInstrus.filter(el=> el.status == '1' && el.isSpotTradingAllowed).length
const _bybitInstrus = bybitInstrus.length


console.log({_mexcInstrus})