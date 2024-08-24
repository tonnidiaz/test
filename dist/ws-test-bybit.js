"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const WS_URL_SPOT_PUBLIC = "wss://stream.bybit.com/v5/public/spot";
const wsSpot = new ws_1.WebSocket(WS_URL_SPOT_PUBLIC);
wsSpot.on("open", (e) => {
    console.log("WS: OPEN", e);
    wsSpot.send(JSON.stringify({ op: "subscribe", args: ["kline.5.SOLUSDT"] }));
});
wsSpot.on("message", (e) => {
    const { data, topic } = JSON.parse(e.toString());
    if (data) {
        const candle = data.map(el => [el.start, el.open, el.high, el.low, el.close, el.volume, el.confirm].map(el => Number(el)))[0];
        console.log("WS: MESSAGE", candle);
    }
});
wsSpot.on("error", (e) => {
    console.log("WS: ERROR", e);
});
