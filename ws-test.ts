import { TestOKX } from "@/classes/test-platforms";
import { botJobSpecs, demo } from "@/utils/constants";
import { heikinAshi, parseDate, parseKlines, tuCE } from "@/utils/funcs2";
import { ensureDirExists } from "@/utils/orders/funcs";
import { config } from "dotenv";
import { scheduleJob } from "node-schedule";
import { WebsocketClient, WsPrivateChannel } from "okx-api";
console.log("START");
/* scheduleJob('m-job', botJobSpecs(60), ()=>{
    console.log(`HELLO @ ${new Date().toISOString()}`);
}) */
config();
const flag = demo ? "1" : "0";
const apiKey = demo ? process.env.OKX_API_KEY_DEV! : process.env.OKX_API_KEY!;
const apiSecret = demo
    ? process.env.OKX_API_SECRET_DEV!
    : process.env.OKX_API_SECRET!;
const passphrase = process.env.OKX_PASSPHRASE!;

let subed = false;
const ws = new WebsocketClient({
    accounts: [{ apiKey, apiPass: passphrase, apiSecret }],
    market: "demo",
});
ws.connectPrivate();
ws.on("open", (e) => {
    console.log("WEB SOCKET CONNECTED");
});
ws.on("error", (e) => {
    console.log("WEB SOCKET ERROR");
});
ws.on("close", (e) => {
    console.log("WEB SOCKET CLOSED");
});

ws.on("response", (resp) => {
    const { event } = resp;
    if (resp.event == "login") {
        if (resp.code != "0") {
            console.log("FAILED TO LOGIN...");
            return;
        }
        console.log("WS AUTH SUCCESS");

         /* SUBSCRIBE TO ORDERS CHANNEL */

        if (!subed) {
            ws.subscribe({ channel: "candle5m", instId: "SOL-USDT" });
            subed = true;
        }
    }
    console.log("object");
    console.log(resp);
    //if (resp.)
    //if (resp.)
});

import {writeFileSync} from 'fs'
async function init(){
    const plat = new TestOKX()
let ts = 0
let klines: any[] = []
const data: any[] = []
ws.on("update", async(e) => {
    if (e.arg.channel == "candle5m"){
        const now = parseDate(new Date())
    console.log(`[${now}]`);
    const _ts = Number(e.data[0][0])
    if (_ts != ts){
        console.log({_ts, ts});
        klines = await plat.getKlines({interval: 5, symbol: "SOL-USDT"})
        ts = _ts
    }
    const candles = tuCE(heikinAshi( parseKlines([...klines, ...e.data]) )) 
    const prevRow = candles[candles.length - 2]
    const row = candles[candles.length - 1]
    data.push({at: now, ...row})
    console.log("SAVING...")
    const fp = "data/rf/klines/live/sol-usdt_5m.json"
    ensureDirExists(fp)
    writeFileSync(fp, JSON.stringify(data))
    console.log("SAVED");
    
    
    }
    
});
}

init()
async function main() {
    while (true) {
        //await Promise.resolve(()=>{setTimeout(()=>{console.log('TIMEOUT');}, 1000)})
    }
}

//main();