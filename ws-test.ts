import { parseDate } from "@/utils/funcs2";
import { KUCOIN_WS_URL } from "@/utils/funcs3";
import { IOrderbook } from "@/utils/interfaces";
import Ws from "ws";


const connect = async() => {
    const PING_INTERVAL = 10 * 1000
    const ws = new Ws(await KUCOIN_WS_URL());
    const keepAlive = () => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
      console.log('Ping sent to server');
    }
  };
    ws.on("open", () => {
        console.log("onOpen");
        setInterval(keepAlive, PING_INTERVAL)
    });
    ws.on("close", (code, rsn) => {
        console.log("onClose:", `${code}: ${rsn}`);
    });
    ws.on("error", (err) => {
        console.log("onError:", `${err.message}`);
    });

    ws.on("message", (buff) => {
        const data = JSON.parse(`${buff}`);
        const { topic } = data;
        let channel = "",
            symbol = "";
        if (data.type == "welcome") {
            console.log("SUBING...");
            // ws.send(
            //     JSON.stringify({
            //         type: "subscribe",
            //         topic: "/spotMarket/level2Depth5:SOL-USDT", //Topic needs to be subscribed. Some topics support to divisional subscribe the informations of multiple trading pairs through ",".
            //         privateChannel: false, //Adopted the private channel or not. Set as false by default.
            //         response: true,
            //     })
            // );
        } else {
            console.log(data)
            if (topic && topic.includes("level2Depth5")) {
                channel = "orderbook";
                symbol = topic.split(":")[1];
                const d = data.data;
                const ob: IOrderbook = {
                    ts: parseDate(Date.now()),
                    asks: d.asks.map((el) => ({
                        px: Number(el[0]),
                        amt: Number(el[1]),
                        cnt: 1,
                    })),
                    bids: d.bids.map((el) => ({
                        px: Number(el[0]),
                        amt: Number(el[1]),
                        cnt: 1,
                    })),
                };

                console.log({ bid: ob.bids[0], ask: ob.asks[0] }, "\n");
            }
        }
    });
};

connect();
