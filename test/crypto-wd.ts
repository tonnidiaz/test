import { Mexc } from "@cmn/classes/mexc";
import { Bot } from "@cmn/models";
import { objPlats } from "@cmn/utils/consts2";
import { clearTerminal } from "@cmn/utils/functions";
import { TPlatName } from "@cmn/utils/interfaces";


clearTerminal()
console.log("Begin");
async function wd({platName, amt, coin, chain, addr, memo} : {platName: TPlatName, amt: number; coin: string; chain: string; addr: string; memo?: string}){
    try {
        const bot = new Bot({name: "TestBot", platform: platName,demo: false })
        const plat = new objPlats[bot.platform](bot)

        
        const r = await plat.withdraw({amt, coin, chain, addr, memo})
        console.log({r});
    } catch (err) {
        console.log(err);
    }
}

// const amt = 1,
// coin = "USDT", chain = "OPTIMISM",
// addr = "0xd9d0d69d98e7d6eea8eaa72e16e869638110749f";
const amt= 2, coin = "KARATE", chain = "HBAR", addr = "0.0.407219", memo = "2088035140"
wd({platName: "mexc", amt, coin, chain, addr, memo})

const binancewdId = "24b14643d2a74a109b461f810c6f07fa"