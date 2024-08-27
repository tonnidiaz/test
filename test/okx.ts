import { objPlats } from "../src/utils/consts2";
import { Bot, Order, User } from "@/models";
import { ensureDirExists } from "../src/utils/orders/funcs";
import {writeFileSync} from "fs"
import { clearTerminal, getSymbol } from "../src/utils/functions";
import { binanceInfo } from "../src/utils/binance-info";
import { binanceInstrus } from "../src/utils/data/instrus/binance-instrus";
import { okxInstrus } from "~/src/data/okx-instrus";

async function getCurrencies(){
    clearTerminal()
    const bot  = new Bot({name: "TBOT", base: "THETA", ccy: "USDT", platform: 'bybit', demo: false})
    try{
        const plat = new objPlats[bot.platform](bot)
        const res = await plat.getCurrencies()
        const savePath = `_data/currencies/${bot.platform}.json`
        ensureDirExists(savePath)
        writeFileSync(savePath, JSON.stringify(res))
        console.log("DONE")
        return res
    }
    catch(e){
        console.log(e)
    }
}


//getCurrencies()

const getMinAmt = (pair: string[], plat: string) =>{

    let amt = 0
    const ccy = getSymbol(pair, plat)
    switch(plat) {
        case 'binance':
            const s1 = binanceInstrus.find(el=> el.symbol == ccy)
            if (!s1) break
            amt = Number(s1.filters.find(el=> el.filterType == "NOTIONAL").minNotional)
       
    }
    console.log(amt)
}

getMinAmt(["SC", "USDT"], "binance")