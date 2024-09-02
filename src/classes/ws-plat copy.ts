// import { IBot } from "@/models/bot";
// import {
//     botLog,
//     ceil,
//     getPricePrecision,
//     getSymbol,
//     sleep,
//     timedLog,
// } from "@/utils/functions";
// import { IBook, IOpenBot, IOrderbook } from "@/utils/interfaces";
// import { TuWs } from "./tu";
// import { DEV, TP } from "@/utils/constants";
// import { Bot } from "@/models";
// import mongoose, { ObjectId } from "mongoose";
// import { Bybit } from "./bybit";
// import { getAmtToBuyWith, getLastOrder, parseDate } from "@/utils/funcs2";
// import { placeArbitOrders } from "@/utils/orders/funcs4";
// import { deactivateBot, reactivateBot } from "@/utils/funcs3";
// import { IOrder } from "@/models/order";
// import { RawData } from "ws";

// const OKX_WS_URL = "wss://ws.okx.com:8443/ws/v5/public";
// const OKX_WS_URL_DEMO = "wss://wspap.okx.com:8443/ws/v5/public";

// const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/spot";
// const BYBIT_WS_URL_DEMO = "wss://stream-testnet.bybit.com/v5/public/spot";

// const SLEEP_MS = 2000;
// const demo = true;

// interface IArbitBot {
//     bot: IBot;
//     active?: boolean;
//     order?: IOrder;
//     pxA?: number;
//     startAmt?: number;
//     baseA?: number;
//     baseB?: number;
//     baseC?: number;
//     pxB?: number;
//     pxC?: number;
//     askA?: number;
//     bidA?: number;
//     askB?: number;
//     bidB?: number;
//     askC?: number;
//     bidC?: number;
//     pairA: string[];
//     pairB: string[];
//     pairC: string[];
// }

// export class WsTriArbit {
//     name: string;
//     ws: TuWs | undefined;
//     ok: boolean = false;
//     arbitBots: IArbitBot[] = [];
//     isConnectError = false;
//     wsURL: string | undefined;
//     open = false;
//     plat: string;

//     constructor(plat: string) {
//         this.name = this.constructor.name;
//         this.plat = plat;

//         console.log(this.name);
//         switch (plat) {
//             case "okx":
//                 this.wsURL = demo ? OKX_WS_URL_DEMO : OKX_WS_URL;
//                 break;
//             case "bybit":
//                 this.wsURL = demo ? BYBIT_WS_URL_DEMO : BYBIT_WS_URL;
//                 break;
//         }
//     }

//     async initWs() {
//         try {
//             if (!this.wsURL) return this._log("WS URL UNDEFINED");

//             if (this.ws?.readyState == this.ws?.OPEN) this.ws?.close();

//             this.isConnectError = false;
//             this.ws = new TuWs(this.wsURL);
//             this.ws.plat = this.plat;

//             this._log("INIT WS");
//             const ws = this.ws;

//             ws?.on("open", async () => {
//                 if (!this.ws) return;

//                 this._log("ON OPEN");
//                 for (let ch of ws.channels) {
//                     await this.ws.sub(ch.channel, ch.data);
//                 }
//                 this.ws.channels = [];

//                 this.open = true;
//             });
//             ws?.on("error", async (e) => {
//                 this._log("ON ERROR", e);
//                 this.isConnectError = e.stack?.split(" ")[2] == "ENOTFOUND";
//                 await sleep(SLEEP_MS);
//             });
//             ws?.on("close", async (e) => {
//                 this.open = false;
//                 this._log("ON CLOSED", e);
//                 if (!this.isConnectError) await this.initWs();
//             });

//             ws?.on("message", async (r) => await this.onMessage(r));
//         } catch (e) {
//             console.log(e);
//         }
//     }

//     async handleTickers({ symbol, abot }: { abot: IArbitBot; symbol: string }) {
//         //DONT RESUME IF RETURN TRUE
//         try {
//             botLog(abot.bot, "\nTickerHandler")
//             const MAX_SLIP = 0.5;

//             const { bot, pairA, pairB, pairC } = abot;
//             let symbolA = getSymbol(abot.pairA, bot.platform);
//             let symbolB = getSymbol(abot.pairB, bot.platform);
//             let symbolC = getSymbol(abot.pairC, bot.platform);

//             // CHECK IF TICKER IS CLOSE ENOUGH TO ASK OR BID
//             const { pxA, pxB, pxC, askA, askB, bidC } = abot;
//             if (
//                 pxA == undefined ||
//                 pxB == undefined ||
//                 pxC == undefined ||
//                 askA == undefined ||
//                 askB == undefined ||
//                 bidC == undefined
//             )
//                 return;

//             const A1 = 1;
//             let _baseA = 0, _baseB = 0;
//             _baseA = A1 / pxA;
//             _baseB = _baseA / pxB;

//             const A2 = _baseB * pxC;

//             // FLIPSIDE
//             _baseB = A1 / pxC
//             _baseA = _baseB * pxB
//             const FA2 = _baseA * pxA

//             const isFlipped = FA2 > A2
//             const A = Math.max(A2, FA2)

//             const perc = Number((((A - A1) / A1) * 100).toFixed(2));

//             botLog(bot, pairA, pairB, pairC);
//             botLog(bot, {isFlipped})
//             botLog(bot, { perc: `${perc}%`, pxA, pxB, pxC, askA, askB, bidC });

//             if (perc >= bot.arbit_settings!.min_perc) {
//                 const pxFromAskA = ceil(((askA - pxA) / pxA) * 100, 2);
//                 const pxFromAskB = ceil(((askB - pxB) / pxB) * 100, 2);
//                 const pxFromBidC = ceil(((pxC - bidC) / bidC) * 100, 2);

//                 const sumCond = pxFromAskA + pxFromAskB + pxFromBidC < perc;
//                 botLog(bot, {
//                     perc: `${perc}%`,
//                     pxFromAskA,
//                     pxFromAskB,
//                     pxFromBidC,
//                     sumCond,
//                 });
//                 return
//                 if (
//                     (pxFromAskA <= MAX_SLIP &&
//                         pxFromAskB <= MAX_SLIP &&
//                         pxFromBidC <= MAX_SLIP) ||
//                     sumCond
//                 ) {
//                     botLog(bot, "WS: ALL GOOD, GOING IN...");
//                     // DOUBLE-CHECK IF BOT IS ACTIVE
//                     const _bot = await Bot.findById(bot.id).exec();
//                     if (!_bot || !_bot.active) {
//                         if (!_bot) {
//                             this.rmvBot(bot.id);
//                         }
//                         return false;
//                     }
//                     const params = {
//                         bot: _bot,
//                         pairA,
//                         pairB,
//                         pairC,
//                         perc,
//                         cPxA: pxA,
//                         cPxB: pxB,
//                         cPxC: pxC,
//                     };
//                     await deactivateBot(bot);
//                     const res = await placeArbitOrders(params);
//                     if (res) await reactivateBot(bot);
//                     return res ? true : false;
//                 }
//             }

//             if (!this.arbitBots.find((el) => el.bot.id)) return false;

//             this.arbitBots = this.arbitBots.map((abot2) => {
//                 return abot2.bot.id == abot.bot.id ? abot : abot2;
//             });
//             return true;
//         } catch (e) {
//             this._log(e);
//             return false;
//         }
//     }
//     async addBot(bot: IBot, first = true) {
//         this._log("ADDING BOT", bot.name);
//         try {
//             const pricePrecision = getPricePrecision(
//                 [bot.base, bot.ccy],
//                 bot.platform
//             );
//             if (pricePrecision == null) return;

//             this.arbitBots = this.arbitBots.filter((el) => el.bot.id != bot.id);
//             const pairA = [bot.B, bot.A];
//             const pairB = [bot.C, bot.B];
//             const pairC = [bot.C, bot.A];

//             this.arbitBots.push({
//                 bot: bot,
//                 pairA,
//                 pairB,
//                 pairC,
//             });

//             await this.sub(bot);

//             if (first) {
//             }
//             this._log("BOT ADDED");
//         } catch (e) {
//             console.log(e);
//         }
//     }

//     async sub(bot: IBot) {
//         // SUB FOR A. B. C
//         const pairA = [bot.B, bot.A];
//         const pairB = [bot.C, bot.B];
//         const pairC = [bot.C, bot.A];

//         let symbolA = getSymbol(pairA, bot.platform);
//         let symbolB = getSymbol(pairB, bot.platform);
//         let symbolC = getSymbol(pairC, bot.platform);

//         let channel1: string | undefined; // Orderbook channel
//         const { platform } = bot;

//         const abot = this.arbitBots.find((el) => el.bot.id == bot.id);
//         if (abot) {
//             if (!abot.order) {
//                 const _botC = await Bot.findById(bot.children[2]).exec();
//                 if (!_botC) return this._log("NO BOT C");

//                 let order = await getLastOrder(_botC);
//                 const bal = getAmtToBuyWith(_botC, order);
//                 abot.order = order ?? undefined;
//                 abot.startAmt = bal;
//             }

//             abot.active = true;
//             this._updateBots(abot);
//         }

//         switch (bot.platform) {
//             case "okx":
//                 channel1 = "books5";
//                 break;
//             case "bybit":
//                 channel1 = `orderbook.200.`;
//                 break;
//         }

//         if (channel1) {
//             // Orderbook channel, also returns ask n bid pxs
//             if (platform == "okx") {
//                 await this.ws?.sub(channel1, { instId: symbolA });
//                 await this.ws?.sub(channel1, { instId: symbolB });
//                 await this.ws?.sub(channel1, { instId: symbolC });
//             } else if (platform == "bybit") {
//                 await this.ws?.sub(channel1 + symbolA);
//                 await this.ws?.sub(channel1 + symbolB);
//                 await this.ws?.sub(channel1 + symbolC);
//             }
//         }
       
//     }
//     async unsub(bot: IBot) {
//         const pairA = [bot.B, bot.A];
//         const pairB = [bot.C, bot.B];
//         const pairC = [bot.C, bot.A];
//         let symbolA = getSymbol(pairA, bot.platform);
//         let symbolB = getSymbol(pairB, bot.platform);
//         let symbolC = getSymbol(pairC, bot.platform);

//         let channel1: string | undefined; // Orderbook channel

//         const { platform } = bot;
//         const abot = this.arbitBots.find((el) => el.bot.id == bot.id);
//         if (abot) {
//             abot.active = false;
//             this._updateBots(abot);
//         }
//         switch (bot.platform) {
//             case "okx":
//                 channel1 = "books5";
//                 break;
//             case "bybit":
//                 channel1 = `orderbook.200.`;
//                 break;
//         }
//         const pairs = [pairA, pairB, pairC].map((el) => el.toString());
//         const activePairs: string[] = [];
//         const activeBots = this.arbitBots.filter(
//             (el) => el.active && el.bot.id != bot.id
//         );
//         for (let abot of activeBots) {
//             activePairs.push(
//                 abot.pairA.toString(),
//                 abot.pairB.toString(),
//                 abot.pairC.toString()
//             );
//         }

//         // if (pairs.includes())

//         const unsubA =
//             activePairs.findIndex((el) => el == pairA.toString()) == -1; // pairA not in any of active bots
//         const unsubB =
//             activePairs.findIndex((el) => el == pairB.toString()) == -1; // pairA not in any of active bots
//         const unsubC =
//             activePairs.findIndex((el) => el == pairC.toString()) == -1; // pairA not in any of active bots

//         console.log({ unsubA, unsubB, unsubC });

//         if (channel1) {
//             // Tickers channel, also returns ask n bid pxs
//             if (platform == "okx") {
//                 if (unsubA) this.ws?.unsub(channel1, { instId: symbolA });
//                 if (unsubB) this.ws?.unsub(channel1, { instId: symbolB });
//                 if (unsubC) this.ws?.unsub(channel1, { instId: symbolC });
//             } else if (platform == "bybit") {
//                 if (unsubA) this.ws?.unsub(channel1 + symbolA);
//                 if (unsubB) this.ws?.unsub(channel1 + symbolB);
//                 if (unsubC) this.ws?.unsub(channel1 + symbolC);
//             }
//         }
    
//     }
//     async rmvBot(botId: mongoose.Types.ObjectId) {
//         this._log("REMOVING BOT", botId, "...");
//         const bot = this.arbitBots.find((el) => el.bot.id == botId);
//         if (bot) {
//             await this.unsub(bot.bot);
//             this.arbitBots = this.arbitBots.filter((el) => el.bot.id != botId);
//         }

//         this._log("BOT REMOVED\n");
//     }

//     _updateBots(abot: IArbitBot) {
//         this.arbitBots = this.arbitBots.map((el) =>
//             el.bot.id == abot.bot.id ? abot : el
//         );
//     }

//     _log(...args: any) {
//         timedLog(`[WS][${this.name}] `, ...args);
//     }

//     async onMessage(resp: RawData) {
//         const r = this.parseData(resp);
//         if (!r) return;
//         const { channel, data, symbol } = r;
//         //return;
//         if (!symbol) return this._log("NO SYMBOL");

//         for (let abot of this.arbitBots) {
//             const { bot, pairA, pairB, pairC } = abot;
//             let symbolA = getSymbol(pairA, bot.platform);
//             let symbolB = getSymbol(pairB, bot.platform);
//             let symbolC = getSymbol(pairC, bot.platform);

//             if (channel == "orderbook" && this.plat == bot.platform) {
//                 // Determine whether to use the flipped or not
//                 const ob = data as IOrderbook;
//                 let enoughAsk: IBook | undefined;

//                 switch (symbol) {
//                     case symbolA:
//                         enoughAsk = ob.asks.find(
//                             (el) => el.amt >= (abot.baseA ?? 0)
//                         );
//                         if (enoughAsk) {
//                             abot.askA = enoughAsk.px;
//                         }
//                         break;
//                     case symbolB:
//                         enoughAsk = ob.asks.find(
//                             (el) => el.amt >= (abot.baseB ?? 0)
//                         );
//                         if (enoughAsk) {
//                             abot.askB = enoughAsk.px;
//                         }
//                         break;
//                     case symbolC:
//                         enoughAsk = ob.bids.find(
//                             (el) => el.amt >= (abot.baseC ?? 0)
//                         );
//                         if (enoughAsk) {
//                             abot.bidC = enoughAsk.px;
//                         }
//                         break;
//                 }

//                 // Update bots
//                 this._updateBots(abot);
//             }

//             const { pxA, pxB, pxC, askA, askB, bidC } = abot;
//             console.log({ pxA, pxB, pxC, askA, askB, bidC });
//             if (
//                 pxA == undefined ||
//                 pxB == undefined ||
//                 pxC == undefined ||
//                 askA == undefined ||
//                 askB == undefined ||
//                 bidC == undefined
//             )
//                 return;

//             // UNSUB FIRST
//             //await this.unsub(abot.bot)
//             if (abot.active) {
//                 abot.active = false;
//                 const re = await this.handleTickers({
//                     abot,
//                     symbol,
//                 });
//                 if (re != false){
//                     abot.active = true
//                 }
//                 this._updateBots(abot)

//                 // if (re != false) {
//                 //     // RE-SUB
//                 //     this._log("\nRE-SUB\n");
//                 //     await this.sub(abot.bot);
//                 // }
//             }

//             //await sleep(SLEEP_MS);
//         }
//         //await sleep(SLEEP_MS);
//     }

//     parseData(resp: RawData) {
//         const parsedResp = JSON.parse(resp.toString());
//         let { data } = parsedResp;
//         let topic: string | undefined;
//         let symbol: string | undefined;
//         if (!data) return console.log({ parsedResp });

//         switch (this.plat) {
//             case "okx":
//                 topic = parsedResp.arg.channel;
//                 symbol = parsedResp.arg.instId;

//                 if (topic?.includes("book")) {
//                     topic = "orderbook";
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
//                 } else if (topic == "tickers") {
//                     data = Number(data[0].last);
//                 }
//                 break;
//             case "bybit":
//                 topic = parsedResp.topic;
//                 if (topic?.includes("orderbook")) {
//                     topic = "orderbook";

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
//         }

//         if (!topic || !symbol) console.log("MISSING:", parsedResp);
//         return { channel: topic, symbol, data };
//     }
// }

// export const wsTriArbits = {
//     okx: new WsTriArbit("okx"),
//     bybit: new WsTriArbit("bybit"),
// };

// export const initWsTriArbit = async () => {
//     try {
//         for (let ws of Object.values(wsTriArbits)) {
//             await ws.initWs();
//         }
//     } catch (e) {
//         timedLog("FAILED TO INIT WS");
//         console.log(e);
//     }
// };
