import { parseDate } from "@/utils/funcs2";
import { safeJsonParse } from "@/utils/funcs3";
import { clearTerminal } from "@/utils/functions";
import { IOrderbook } from "@/utils/interfaces";
import { WebsocketClient } from "binance";
import { WebSocket } from "ws";

clearTerminal()
const WS_URL_SPOT_PUBLIC = "wss://stream.bybit.com/v5/public/spot";

const wsSpot = new WebsocketClient({})
wsSpot.connectToWsUrl("wss://stream.binance.com:9443/ws/bnbbtc@depth", undefined, true)
wsSpot.connectToWsUrl("wss://stream.binance.com:9443/ws/solusdt@depth", undefined, true)

wsSpot.on("message", (e: any) => {
    let {data, topic} = safeJsonParse(e.toString())
    if (data){
        console.log(data);
        
       // const candle = data.map(el=> [el.start, el.open, el.high, el.low, el.close, el.volume, el.confirm].map(el=> Number(el)))[0]
    //console.log("WS: MESSAGE", candle);
    } else if (e?.e == 'depthUpdate'){
        const symbol = e.s
        const ob: IOrderbook = {
            ts: parseDate(e.E),
            asks: e.a.map(el=> ({
                px: Number(el[0]),
                amt: Number(el[1]),
            })),
            bids: e.b.map(el=> ({
                px: Number(el[0]),
                amt: Number(el[1]),
            })),
        }
        console.log({symbol,})

        
    }
    
});
wsSpot.on("error", (e) => {
    console.log("WS: ERROR", e);
});

const channel = "wss://stream.binance.com:9443/ws/bnbbtc@depth" 
setTimeout(()=>{
    console.log("\nCLOSING...\n")
    wsSpot.close(channel, false)
    setTimeout(()=>{
        console.log("\nRECONNECT...")
        wsSpot.connectToWsUrl(channel, undefined, true)
    }, 5000)
}, 5000)
