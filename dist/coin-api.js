"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@/utils/functions");
const axios_1 = __importDefault(require("axios"));
const symbol_id = "BYBITSPOT_SPOT_SOL_USDT";
const klinesURL = `https://rest.coinapi.io/v1/ohlcv/${symbol_id}/history`;
const order_book_URL = `https://rest.coinapi.io/v1/orderbooks/${symbol_id}/history`;
const headers = {
    "X-CoinAPI-Key": "5CFA6702-2C91-4F98-A45B-FAB3564E0A90" //"2851C217-28DF-4101-9B79-37A206346424"//"DC1A54FA-ECCC-40A8-A2FE-E094386A30F9"//"CDE0DA21-63A5-4AFA-B3BE-B93D6447EAFF"
};
const params = {
    //"period_id": "15MIN",
    "limit": 100000,
    "time_end": "2024-06-20T00:00:00",
    "time_start": "2024-06-18T00:00:00",
};
const get_klines = () => {
    const res = axios_1.default.get(klinesURL, { params, headers });
    /* with open('data/coin-api/bybit-spot/klines.json', 'w') as f:
        
        json.dump(res.json(), f) */
    console.log("DONE");
};
const order_book_file = `data/coin-api/bybit-spot/orderbook/${symbol_id}_${params['time_start'].split('T')[0]}_${params['time_end'].split('T')[0]}.json`;
const get_order_book = () => {
    return;
    const res = axios_1.default.get(order_book_URL, { params, headers });
    /* WRITE TO FILE */
    console.log("DONE");
};
const readOrderBook = () => {
    console.log('READING...');
    const data = (0, functions_1.readJson)(order_book_file);
    return data;
};
const readKlines = () => {
    const pth = "data/coin-api/bybit-spot/SOL-USDT_2024-06-18_2024-06-19.json";
    const klines = true ? (0, functions_1.readJson)('data/coin-api/bybit-spot/SOL-USDT.json') : (0, functions_1.readJson)(pth).map(e => ({ ts: e.time_period_start, o: e.price_open, h: e.price_high, l: e.price_low, c: e.price_close, v: e.volume_traded }));
    return klines;
};
const simulateLimitOrder = async (orderPrice, orderType) => {
    const priceData = readKlines();
    const orderBookData = readOrderBook();
    if (priceData.length === 0 || orderBookData.length === 0) {
        console.log('No data available');
        return;
    }
    let orderFilled = false;
    let fillPrice = 0;
    let fillTime = 0;
    for (let i = 1; i < priceData.length; i++) {
        const candle = priceData[i];
        /* OB KEYS: [ 'symbol_id', 'time_exchange', 'time_coinapi', 'asks', 'bids' ] */
        const orderBookSnapshot = orderBookData.find(snapshot => Date.parse(snapshot.time_exchange) <= Date.parse(candle.ts));
        if (!orderBookSnapshot)
            continue;
        const bestBid = orderBookSnapshot.bids[0];
        const bestAsk = orderBookSnapshot.asks[0];
        if (orderType === 'buy' && orderPrice >= bestAsk.price) {
            orderFilled = true;
            fillPrice = Math.min(orderPrice, bestAsk.price);
            fillTime = candle.ts;
            break;
        }
        else if (orderType === 'sell' && orderPrice <= bestBid.price) {
            orderFilled = true;
            fillPrice = Math.max(orderPrice, bestBid.price);
            fillTime = candle.ts;
            break;
        }
    }
    if (orderFilled) {
        console.log(`Order filled at ${fillPrice} on ${new Date(fillTime).toISOString()}`);
    }
    else {
        console.log('Order not filled due to slippage');
    }
};
// Example usage
const orderPrice = 136.5; // Example limit order price
const orderType = 'buy'; // or 'sell'
const startTime = '2023-01-01T00:00:00';
const endTime = '2023-01-01T23:59:59';
simulateLimitOrder(orderPrice, orderType);
//# sourceMappingURL=coin-api.js.map