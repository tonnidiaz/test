import WebSocket from "ws";
import fs from "fs";
import {WebsocketClient} from 'bybit-api'
import { ensureDirExists } from "@/utils/orders/funcs";
import { parseDate } from "@/utils/funcs2";

const wsURL = "wss://stream-testnet.bybit.com/v5/public/linear"
const ws = new WebSocket(wsURL);

const orderBookData: {
    timestamp: string;
    data: any;
}[] = [];

const symbol = "SOLUSDT", tpc = "orderbook.200";
const saveInterval = 60000; // Save data every 60 seconds

ws.on("open", function open() {
    console.log("WebSocket connection opened");
    ws.send(
        JSON.stringify({
            op: "subscribe",
            params: {binary: false},
            args: [
                
                `${tpc}.${symbol}`
            ]
        })
    );
});

ws.on("message", function incoming(data) {
    const parsedData = JSON.parse(data.toString());
    console.log(parsedData.data?.s);
    if (parsedData.topic && parsedData.topic.startsWith(tpc)) {
        const timestamp = parseDate(new  Date());
        const orderBookSnapshot = {
            timestamp,
            data: parsedData.data,
        };
        orderBookData.push(orderBookSnapshot);
    }
});

setInterval(() => {
    console.log('SAVING');
    const filename = `src/data/order-book/${symbol}_order_book_${parseDate(new Date()).replace(/[:.]/g, "_")}.json`;
        ensureDirExists(filename)
    fs.writeFileSync(filename, JSON.stringify(orderBookData, null, 2));
    console.log(`Order book data saved to ${filename}`);
    orderBookData.length = 0; // Clear the array after saving
}, saveInterval);

ws.on("close", function close() {
    console.log("WebSocket connection closed");
});
