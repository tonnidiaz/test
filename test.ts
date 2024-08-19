import { binanceInstrus } from "@/data/instrus/binance-instrus";
import { bitgetInstrus } from "@/data/instrus/bitget-instrus";
import { gateioInstrus } from "@/data/instrus/gateio-instrus";
import { okxInstrus } from "@/data/instrus/okx-instrus";
import { bybitInstrus } from "@/data/instrus/bybit-instrus";
import { parseDate } from "@/utils/funcs2";
import { randomNum } from "@/utils/functions";
import { scheduleJob } from "node-schedule";

const _gateioInstrus = gateioInstrus.filter(el=> el.trade_status == 'tradable').length
const _bitgetInstrus = bitgetInstrus.filter(el=> el.status == 'online').length
const _okxInstrus = okxInstrus.filter(el=> el.state == 'live').length
const _binanceInstrus = binanceInstrus.filter(el=> el.status == 'TRADING' && el.isSpotTradingAllowed).length
const _bybitInstrus = bybitInstrus.length


console.log(
    {
        _gateioInstrus,
        _bitgetInstrus,
        _bybitInstrus,
        _binanceInstrus,
        _okxInstrus,

    })