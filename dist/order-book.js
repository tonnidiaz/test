"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const fs_1 = __importDefault(require("fs"));
const funcs_1 = require("@/utils/orders/funcs");
const funcs2_1 = require("@/utils/funcs2");
const wsURL = "wss://stream-testnet.bybit.com/v5/public/linear";
const ws = new ws_1.default(wsURL);
const orderBookData = [];
const symbol = "SOLUSDT", tpc = "orderbook.200";
const saveInterval = 60000; // Save data every 60 seconds
ws.on("open", function open() {
    console.log("WebSocket connection opened");
    ws.send(JSON.stringify({
        op: "subscribe",
        params: { binary: false },
        args: [
            `${tpc}.${symbol}`
        ]
    }));
});
ws.on("message", function incoming(data) {
    const parsedData = JSON.parse(data.toString());
    console.log(parsedData.data?.s);
    if (parsedData.topic && parsedData.topic.startsWith(tpc)) {
        const timestamp = (0, funcs2_1.parseDate)(new Date());
        const orderBookSnapshot = {
            timestamp,
            data: parsedData.data,
        };
        orderBookData.push(orderBookSnapshot);
    }
});
setInterval(() => {
    console.log('SAVING');
    const filename = `src/data/order-book/${symbol}_order_book_${(0, funcs2_1.parseDate)(new Date()).replace(/[:.]/g, "_")}.json`;
    (0, funcs_1.ensureDirExists)(filename);
    fs_1.default.writeFileSync(filename, JSON.stringify(orderBookData, null, 2));
    console.log(`Order book data saved to ${filename}`);
    orderBookData.length = 0; // Clear the array after saving
}, saveInterval);
ws.on("close", function close() {
    console.log("WebSocket connection closed");
});
//# sourceMappingURL=order-book.js.map