// import type { IBook, IOrderbook, ICrossClientBot, ICrossArbitBot } from "~/utils/interfaces";
// import axios from "axios";
// import { CrossArbitData, TuWs } from "../tu";
// import { DEV } from "@/utils/constants";
// import { ceil, getSymbol, timedLog } from "@/utils/functions";
// import { parseDate } from "@/utils/funcs2";
// import { RawData } from "ws";

// const OKX_WS_URL = "wss://ws.okx.com:8443/ws/v5/public";
// const OKX_WS_URL_DEMO = "wss://wspap.okx.com:8443/ws/v5/public";

// const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/spot";
// const BYBIT_WS_URL_DEMO = "wss://stream-testnet.bybit.com/v5/public/spot";
// const BINANCE_WS_URL = "wss://stream.binance.com:9443";
// const KUCOIN_TOKEN_URL = "https://api.kucoin.com/api/v1/bullet-public";
// let kucoinTokenTs = Date.now();
// let kucoinToken = "";

// export const getKucoinToken = async () => {
//     const diff = Date.now() - kucoinTokenTs;
//     if (diff < 60 * 60000 && kucoinToken.length) return kucoinToken;
//     try {
//         const r = await axios.post(KUCOIN_TOKEN_URL);
//         kucoinToken = r.data?.data?.token ?? "";
//         return kucoinToken;
//     } catch (e) {
//         console.log("FAILED TO GET KUCOIN TOKEN");
//         console.log(e);
//     }
// };
// export const KUCOIN_WS_URL = async () =>
//     "wss://ws-api-spot.kucoin.com/?token=" + (await getKucoinToken());


// const demo = false;
// export class CrossWs {
//     ws: TuWs | undefined;

//     abots: ICrossArbitBot[] = [];
//     isConnectError = false;
//     wsURL: string | undefined;
//     open = false;
//     name: string;
//     reconnectInterval: number;
//     maxReconnectAttempts: number;
//     currentReconnectAttempts: number;
//     PING_INTERVAL = 10 * 1000;

//     constructor(plat: string) {
//         this.name = this.constructor.name;
//         this.plat = plat.toLowerCase();
//         this.reconnectInterval = 5000; // 5 seconds by default
//         this.maxReconnectAttempts = 10; // Max reconnection attempts
//         this.currentReconnectAttempts = 0;

//         this._log(this.name);
//         switch (plat) {
//             case "okx":
//                 this.wsURL = demo ? OKX_WS_URL_DEMO : OKX_WS_URL;
//                 break;
//             case "bybit":
//                 this.wsURL = demo ? BYBIT_WS_URL_DEMO : BYBIT_WS_URL;
//                 break;
//             case "binance":
//                 this.wsURL = BINANCE_WS_URL;
//                 break;
//             case "kucoin":
//                 this.wsURL = "url";
//                 break;
//         }
//     }

//     async initWs() {
//         try {
//             if (!this.wsURL) return this._log("WS URL UNDEFINED");
//             this._log("initWs()");
//             //if (this.ws?.readyState == this.ws?.OPEN) this.ws?.close();

//             this.isConnectError = false;
//             if (this.plat.toLocaleLowerCase() == "kucoin") {
//                 this.wsURL = await KUCOIN_WS_URL();
//             }
//             this.ws = new TuWs(this.wsURL);
//             this.ws.plat = this.plat;
//             if (!this.open) this._log("INIT WS");

//             this.ws?.on("open", async () => {
//                 if (!this.ws) return this._log("ON OPEN: BUT NO WS");
//                 this._log("ON OPEN");
//                 for (let abot of this.abots) {
//                     console.log("RESUBING FOR BOT: ", abot.bot.id);
//                     await this.sub(abot.bot);
//                 }
//                 this.ws.channels = [];
//                 this.currentReconnectAttempts = 0;
//                 this.open = true;
//                 setInterval(() => this.ws?.keepAlive(), this.PING_INTERVAL);
//             });
//             this.ws?.on("error", async (e) => {
//                 this._log("ON ERROR", e);
//                 this.isConnectError = e.stack?.split(" ")[2] == "ENOTFOUND";
//             });
//             this.ws?.on("close", async (code, rsn) => {
//                 this._log(`[onClose] CODE: ${code}\nREASON: ${rsn}`);
//                 // if (!this.isConnectError) await this.initWs();
//                 this.reconnect();
//             });

//             this.ws?.on("message", async (r) => await this.onMessage(r));
//         } catch (e) {
//             this._log(e);
//         }
//     }
//     async addBot(bot: ICrossClientBot, data: CrossArbitData) {
//         this._log("ADDING BOT", bot.id);
//         try {
//             if (this.ws?.readyState != this.ws?.OPEN) {
//                 await this.initWs();
//                 //return await this.addBot(bot, first)
//             }
//             this.abots = this.abots.filter((el) => el.bot.id != bot.id);

//             this.abots.push({
//                 bot: bot,
//                pair: bot.pair,
//                 active: true,
//                 data
//             });

//             await this.sub(bot);
//             this._log("BOT ADDED");
//         } catch (e) {
//             this._log(e);
//         }
//     }

//     reconnect() {
//         if (this.currentReconnectAttempts < this.maxReconnectAttempts) {
//             if (DEV)
//                 this._log(
//                     `Reconnecting in ${
//                         this.reconnectInterval / 1000
//                     } seconds...`
//                 );
//             setTimeout(() => {
//                 this.currentReconnectAttempts++;
//                 if (DEV)
//                     this._log(
//                         `Reconnection attempt ${this.currentReconnectAttempts}/${this.maxReconnectAttempts}`
//                     );
//                 this.initWs();
//             }, this.reconnectInterval);
//         } else {
//             this._log(
//                 "Max reconnect attempts reached. Stopping reconnection attempts."
//             );
//         }
//     }
//     async handleTickers({ symbol, abot }: { abot: ICrossArbitBot; symbol: string }) {
//         //DONT RESUME IF RETURN TRUE
//         try {
//             console.log("\nTickerHandler");
//             const MAX_SLIP = 0.5;

//             const { bot, pairA, pairB, pairC, bookA, bookB, bookC } = abot;
//             let symbolA = getSymbol(abot.pairA, bot.platform);
//             let symbolB = getSymbol(abot.pairB, bot.platform);
//             let symbolC = getSymbol(abot.pairC, bot.platform);

//             // CHECK IF TICKER IS CLOSE ENOUGH TO ASK OR BID
//             if (bookA == undefined || bookB == undefined || bookC == undefined)
//                 return;

//             const A = 1;
//             //Normal prices
//             let pxA = bookA.ask.px;
//             let pxB = bookB.ask.px;
//             let pxC = bookC.bid.px;

//             //Flipped prices
//             let fpxC = bookC.ask.px;
//             let fpxB = bookB.bid.px;
//             let fpxA = bookA.bid.px;

//             const A2 = (A * pxC) / (pxA * pxB); // BUY A, BUY B, SELL C
//             const FA2 = (A * fpxA * fpxB) / fpxC; //BUY C, SELL B, SELL A

//             const _perc = ceil(((A2 - A) / A) * 100, 2);
//             const _fperc = ceil(((FA2 - A) / A) * 100, 2);
//             const perc = Math.max(_perc, _fperc);

//             const flipped = _perc < _fperc;

//             console.log(pairA, pairB, pairC, "\n", { pxA, pxB, pxC }, "\n", {
//                 fpxA,
//                 fpxB,
//                 fpxC,
//             });

//             console.log({ _perc: `${_perc}%`, _fperc: `${_fperc}%`, flipped });

//             return true;
//         } catch (e) {
//             this._log(e);
//             return false;
//         }
//     }

//     /**
//      *
//      * @param bot An arbitrage bot with A, B, and C
//      */
//     async sub(bot: ICrossClientBot) {
//         // SUB FOR A. B. C
//         await this.subUnsub(bot, "sub");
//     }

//     async subUnsub(bot: ICrossClientBot, act: "sub" | "unsub" = "sub") {
//         let channel1A: string | undefined; // Orderbook channel
//         let channel1B: string | undefined; // Orderbook channel
//         const { platA, platB, pair } = bot;

//         let symbolA = getSymbol(pair, platA);
//         let symbolB = getSymbol(pair, platB);

//         switch (platA) {
//             case "okx":
//                 channel1A = "books5";
//                 break;
//             case "bybit":
//                 channel1A = `orderbook.200.`;
//                 break;
//             case "binance":
//                 channel1A = `orderbook.200.`;
//                 break;
//             case "kucoin":
//                 channel1A = `/spotMarket/level2Depth5:`;
//                 break;
//         }
        
//         switch (platB) {
//             case "okx":
//                 channel1B = "books5";
//                 break;
//             case "bybit":
//                 channel1B = `orderbook.200.`;
//                 break;
//             case "binance":
//                 channel1B = `orderbook.200.`;
//                 break;
//             case "kucoin":
//                 channel1B = `/spotMarket/level2Depth5:`;
//                 break;
//         }

//         if (!this.ws) {
//             await this.initWs();
//             //return await this.subUnsub(bot, act)
//         }
//         const fn =
//             act == "sub"
//                 ? this.ws?.sub.bind(this.ws)
//                 : this.ws?.unsub.bind(this.ws);

//         console.log(`\n${act}ing...`);

//         if (act == "unsub") {
//         }
//         const activePairs: {plat: string; pair: string}[] = [];
//         const activeBots = this.abots.filter(
//             (el) => el.active && el.bot.id != bot.id
//         );
//         for (let abot of activeBots) {
//             activePairs.push({plat: abot.bot.platA, pair:pair.toString()} );
//             activePairs.push({plat: abot.bot.platB, pair:pair.toString()} );
//         }

//         // if (pairs.includes())

//         const unsubA =
//             activePairs.findIndex((el) => el.pair == pair.toString() && el.plat == platA) == -1; // pairA not in any of active bots
//         const unsubB =
//             activePairs.findIndex((el) => el.pair == pair.toString() && el.plat == platB) == -1; // pairA not in any of active bots
        
//         if (this.ws?.readyState != this.ws?.OPEN){
//             return this._log("NOT READY")
//         }
//         if (channel1A && channel1B && fn) {
//             // Orderbook channel, also returns ask n bid pxs
           
//                 switch (platA){
//                     case 'okx':
//                         if (act == 'sub' || unsubA) fn(channel1A, platA, {instId: symbolA})
//                         break;
//                     case 'bybit':
//                     case 'kucoin':
//                         if (act == 'sub' || unsubA) fn(channel1A + symbolA, platA)
//                         break
//                 }
//                 switch (platB){
//                     case 'okx':
//                         if (act == 'sub' || unsubB) fn(channel1B, platB, {instId: symbolB})
//                         break;
//                     case 'bybit':
//                     case 'kucoin':
//                         if (act == 'sub' || unsubB) fn(channel1B + symbolB, platB)
//                         break
//                 }
                    
            
//         }
//     }
//     async unsub(bot: ICrossClientBot) {
//         await this.subUnsub(bot, "unsub");
//     }
//     async onMessage(resp: RawData) {
//         const r = this.parseData(resp);
//         if (!r) return;
//         const { channel, data, symbol } = r;
//         //return;
//         if (!symbol) return this._log("NO SYMBOL");

//         for (let abot of this.abots) {
//             const { bot, pair } = abot;
//             const {platA, platB} = bot

//             let symbolA = getSymbol(pair, platA);
//         let symbolB = getSymbol(pair, platB);

//             if (channel == "orderbook" && symbol == pair.toString()) {
//                 // Determine whether to use the flipped or not
//                 const ob = data as IOrderbook;
//                 let enoughAsk: IBook | undefined;
//                 const {
//                     bookA: oldBookA,
//                     bookB: oldBookB,
//                 } = abot;
//                 switch (symbol) {
//                     case symbolA:
//                         abot.bookA = {
//                             ask: ob.asks[0],
//                             bid: ob.bids[0],
//                         };
//                         break;
//                     case symbolB:
//                         abot.bookB = {
//                             ask: ob.asks[0],
//                             bid: ob.bids[0],
//                         };
//                         break;
                   
//                         break;
//                 }

//                 // Update bots
//                 //this._updateBots(abot);

//                 const { bookA, bookB } = abot;
//                 //this._log("\n", { plat: this.plat, pairC });
//                 //this._log({ bookC });
//                 //await sleep(SLEEP_MS);
//                 //return;

//                 if (
//                     bookA == undefined ||
//                     bookB == undefined ||
//                     bookC == undefined
//                 ) {
//                     this._log("\nNO BOOK\n");
//                     return;
//                 }
//                 //this._log({ bookA, bookB, bookC });
//                 //await sleep(5000)
//                 // UNSUB FIRST
//                 //await this.unsub(abot.bot)
//                 const bookCond =
//                     oldBookA != bookA || oldBookB != bookB || oldBookC != bookC;

//                 const bookFieldsCond =
//                     bookA.bid &&
//                     bookA.ask &&
//                     bookB.bid &&
//                     bookB.ask &&
//                     bookC.bid &&
//                     bookC.ask;

//                 if (abot.active && bookCond && bookFieldsCond) {
//                     abot.active = false;
//                     const re = await this.handleTickers({
//                         abot,
//                         symbol,
//                     });

//                     if (re != false) {
//                         abot.active = true;
//                     } else {
//                         this._log("NOT RESUMING");
//                     }
//                     //this._updateBots(abot);
//                 } else if (abot.active) {
//                     if (DEV) console.log({ bookA, bookB, bookC });
//                 }
//             }
//         }
//     }

//     parseData(resp: any) {
//         const parsedResp = JSON.parse(resp.toString());
//         let { data, topic, type } = parsedResp;
//         let channel: string | undefined;
//         let symbol: string | undefined;
//         if (!data) {
//             this._log({ parsedResp });
//             return;
//         }

//         switch (this.plat) {
//             case "okx":
//                 channel = parsedResp.arg.channel;
//                 symbol = parsedResp.arg.instId;

//                 if (channel?.includes("book")) {
//                     channel = "orderbook";
//                     const ob: IOrderbook = {
//                         ts: parseDate(Number(data[0].ts)),
//                         bids: data[0].bids.map((el) => ({
//                             px: Number(el[0]),
//                             amt: Number(el[1]),
//                             cnt: Number(el[3]),
//                         })),
//                         asks: data[0].asks.map((el) => ({
//                             px: Number(el[0]),
//                             amt: Number(el[1]),
//                             cnt: Number(el[3]),
//                         })),
//                     };
//                     data = ob;
//                 } else if (channel == "tickers") {
//                     data = Number(data[0].last);
//                 }
//                 break;
//             case "bybit":
//                 channel = parsedResp.topic;
//                 if (channel?.includes("orderbook")) {
//                     channel = "orderbook";

//                     symbol = data.s;
//                     const ob: IOrderbook = {
//                         ts: parseDate(Date.now()),
//                         bids: data.b.map((el) => ({
//                             px: Number(el[0]),
//                             amt: Number(el[1]),
//                             cnt: 1,
//                         })),
//                         asks: data.a.map((el) => ({
//                             px: Number(el[0]),
//                             amt: Number(el[1]),
//                             cnt: 1,
//                         })),
//                     };

//                     data = ob;
//                 }

//                 break;
//             case "kucoin":
//                 if (topic && topic.includes("level2Depth5")) {
//                     channel = "orderbook";
//                     symbol = topic.split(":")[1];
//                     const d = data;
//                     const ob: IOrderbook = {
//                         ts: parseDate(Date.now()),
//                         asks: d.asks.map((el) => ({
//                             px: Number(el[0]),
//                             amt: Number(el[1]),
//                             cnt: 1,
//                         })),
//                         bids: d.bids.map((el) => ({
//                             px: Number(el[0]),
//                             amt: Number(el[1]),
//                             cnt: 1,
//                         })),
//                     };

//                     data = ob;
//                 }
//                 break;
//         }

//         if (!channel || !symbol) this._log("MISSING:", parsedResp);
//         if (channel == "orderbook") {
//             //SORT ORDERBOOK
//             const ob: IOrderbook = data;
//             //this._log({bids: ob.bids, asks: ob.asks})
//             //data = { ...ob, asks: ob.asks.sort((a, b) => a.px - b.px), bids: ob.bids.sort((a, b) => b.px - a.px) };
//         }
//         return { channel: channel, symbol, data };
//     }
//     _log(...args: any) {
//         timedLog(`[WS][${this.plat}] `, ...args);
//     }

//     kill(){
//         this.abots = []
//         this.ws?.removeAllListeners()
//     }
// }
// export const clientWsCrossArbits = {
//     okx: new CrossWs("okx"),
//     bybit: new CrossWs("bybit"),
//     kucoin: new CrossWs("kucoin"),
// };

// export const initClientWsCrossArbit = async () => {
//     try {
//         // for (let ws of Object.values(clientWsCrossArbits) as any[]) {
//         //     await ws.initWs();
//         // }
//     } catch (e) {
//         timedLog("FAILED TO INIT WS");
//         console.log(e);
//     }
// };
