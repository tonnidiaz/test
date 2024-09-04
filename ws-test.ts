import { parseDate } from "@/utils/funcs2";
import { IOrderbook } from "@/utils/interfaces";
import Ws from "ws";

const KUCOIN_API_SECRET = "35dc9c1d-51aa-4fad-be79-280be6155b59",
    KUCOIN_API_KEY = "66d6db260ead2400015e90ea",
    KUCOIN_TOKEN =
        "2neAiuYvAU61ZDXANAGAsiL4-iAExhsBXZxftpOeh_55i3Ysy2q2LEsEWU64mdzUOPusi34M_wGoSf7iNyEWJ7Hpi6VkzA_HnrsEt757fLDI01cJ3EoydNiYB9J6i9GjsxUuhPw3Blq6rhZlGykT3Vp1phUafnulOOpts-MEmEGpNUI84S6vrJTgyxX8E4rMJBvJHl5Vs9Y=.LmLBJkS2mQLCJn4B0fVRXw==";
const connect = () => {
    const ws = new Ws("wss://ws-api-spot.kucoin.com/?token=" + KUCOIN_TOKEN);
    ws.on("open", () => {
        console.log("onOpen");
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
        let channel = "", symbol = ''; 
        if (data.type == "welcome") {
            console.log("SUBING...");
            ws.send(
                JSON.stringify({
                    type: "subscribe",
                    topic: "/spotMarket/level2Depth5:SOL-USDT", //Topic needs to be subscribed. Some topics support to divisional subscribe the informations of multiple trading pairs through ",".
                    privateChannel: false, //Adopted the private channel or not. Set as false by default.
                    response: true,
                })
            );
        } else {
            if (topic && topic.includes("level2Depth5")) {
                channel = "orderbook";
                symbol = topic.split(':')[1]
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

                console.log({bid: ob.bids[0], ask: ob.asks[0]}, '\n')
            }
        }
    });
};

//connect();
