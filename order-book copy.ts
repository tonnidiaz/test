import WebSocket from "ws";
import fs from "fs";
import {WebsocketClient} from 'bybit-api'

const ws = new WebSocket("wss://stream.bybit.com/realtime");

const orderBookData: {
    timestamp: string;
    data: any;
}[] = [];

const symbol = "SOLUSDT";
const saveInterval = 60000; // Save data every 60 seconds

ws.on("open", function open() {
    console.log("WebSocket connection opened");
    ws.send(
        JSON.stringify({
            topic: `orderBookL2_25.${symbol}`,
            event: "sub",
            params: {
                binary: false,
            },
        })
    );
});

ws.on("message", function incoming(data) {
    const parsedData = JSON.parse(data.toString());
    if (parsedData.topic && parsedData.topic.startsWith("orderBookL2_25")) {
        const timestamp = new Date().toISOString();
        const orderBookSnapshot = {
            timestamp,
            data: parsedData.data,
        };
        orderBookData.push(orderBookSnapshot);
    }
});

setInterval(() => {
    const filename = `src/data/order-book/${symbol}_order_book_${new Date()
        .toISOString()
        .replace(/[:.]/g, "_")}.json`;
    fs.writeFileSync(filename, JSON.stringify(orderBookData, null, 2));
    console.log(`Order book data saved to ${filename}`);
    orderBookData.length = 0; // Clear the array after saving
}, saveInterval);

ws.on("close", function close() {
    console.log("WebSocket connection closed");
});
