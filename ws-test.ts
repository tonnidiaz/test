import { botJobSpecs, demo } from "@/utils/constants";
import { heikinAshi, parseDate, parseKlines } from "@/utils/funcs2";
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
            ws.subscribe({ channel: "candle3m", instId: "SOL-USDT" });
            subed = true;
        }
    }
    console.log("object");
    console.log(resp);
    //if (resp.)
    //if (resp.)
});

ws.on("update", (e) => {
    if (e.arg.channel == "candle3m"){
    console.log(`[${parseDate(new Date())}]`);
    const candles = heikinAshi( parseKlines(e.data) )
    console.log(candles);

    }
    
});
async function main() {
    while (true) {
        //await Promise.resolve(()=>{setTimeout(()=>{console.log('TIMEOUT');}, 1000)})
    }
}

//main();