import { IBot } from "@/models/bot";
import {
    botLog,
    ceil,
    getPricePrecision,
    getSymbol,
    sleep,
    timedLog,
} from "@/utils/functions";
import { IBook, IOpenBot, IOrderbook, IOrderpage } from "@/utils/interfaces";
import { TuWs } from "./tu";
import { DEV, TP } from "@/utils/constants";
import { Bot } from "@/models";
import mongoose, { ObjectId } from "mongoose";
import { Bybit } from "./bybit";
import { getLastOrder, parseDate } from "@/utils/funcs2";
import {
    placeArbitOrders,
    placeArbitOrdersFlipped,
} from "@/utils/orders/funcs4";
import { deactivateBot, reactivateBot } from "@/utils/funcs3";
import { IOrder } from "@/models/order";
import { RawData } from "ws";
import axios from "axios";

const OKX_WS_URL = "wss://ws.okx.com:8443/ws/v5/public";
const OKX_WS_URL_DEMO = "wss://wspap.okx.com:8443/ws/v5/public";

const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/spot";
const BYBIT_WS_URL_DEMO = "wss://stream-testnet.bybit.com/v5/public/spot";
const BINANCE_WS_URL = "wss://stream.binance.com:9443";

const KUCOIN_TOKEN_URL = "https://api.kucoin.com/api/v1/bullet-public";
let kucoinTokenTs = Date.now();
let kucoinToken = "";

const getKucoinToken = async () => {
    const diff = Date.now() - kucoinTokenTs;
    if (diff < 60 * 60000 && kucoinToken.length) return kucoinToken;
    try {
        const r = await axios.post(KUCOIN_TOKEN_URL);
        kucoinToken = r.data?.data?.token ?? "";
        return kucoinToken;
    } catch (e) {
        console.log("FAILED TO GET KUCOIN TOKEN");
        console.log(e);
    }
};
const KUCOIN_WS_URL = (tkn: any) =>
    "wss://ws-api-spot.kucoin.com/?token=" + tkn;

const SLEEP_MS = 10 * 1000;
const demo = false;

interface IArbitBot {
    bot: IBot;
    active?: boolean;
    order?: IOrder;
    startAmt?: number;
    bookA?: IOrderpage;
    bookB?: IOrderpage;
    bookC?: IOrderpage;
    pairA: string[];
    pairB: string[];
    pairC: string[];
}

export class WsTriArbit {
    name: string;
    ws: TuWs | undefined;
    ok: boolean = false;
    arbitBots: IArbitBot[] = [];
    isConnectError = false;
    wsURL: string | undefined;
    open = false;
    plat: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    currentReconnectAttempts: number;

    constructor(plat: string) {
        this.name = this.constructor.name;
        this.plat = plat;
        this.reconnectInterval = 5000; // 5 seconds by default
        this.maxReconnectAttempts = 10; // Max reconnection attempts
        this.currentReconnectAttempts = 0;

        this._log(this.name);
        switch (plat) {
            case "okx":
                this.wsURL = demo ? OKX_WS_URL_DEMO : OKX_WS_URL;
                break;
            case "bybit":
                this.wsURL = demo ? BYBIT_WS_URL_DEMO : BYBIT_WS_URL;
                break;
            case "binance":
                this.wsURL = BINANCE_WS_URL;
                break;
            case "kucoin":
                this.wsURL = "url";
                break;
        }
    }

    async initWs() {
        try {
            if (!this.wsURL) return this._log("WS URL UNDEFINED");

            if (this.ws?.readyState == this.ws?.OPEN) this.ws?.close();

            this.isConnectError = false;
            if (this.plat.toLocaleLowerCase() == "kucoin") {
                this.wsURL = KUCOIN_WS_URL(await getKucoinToken());
            }
            this.ws = new TuWs(this.wsURL);
            this.ws.plat = this.plat;
            if (!this.open) this._log("INIT WS");
            const ws = this.ws;

            ws?.on("open", async () => {
                if (!this.ws) return;
                if (!this.open) this._log("ON OPEN");
                for (let ch of ws.channels) {
                    await this.ws.sub(ch.channel, ch.plat, ch.data);
                }
                this.ws.channels = [];
                this.currentReconnectAttempts = 0
                this.open = true;
            });
            ws?.on("error", async (e) => {
                this._log("ON ERROR", e);
                this.isConnectError = e.stack?.split(" ")[2] == "ENOTFOUND";
                await sleep(SLEEP_MS);
            });
            ws?.on("close", async (code, rsn) => {
                if (DEV) this._log(`[onClose] CODE: ${code}\nREASON: ${rsn}`);
                // if (!this.isConnectError) await this.initWs();
                this.reconnect();
            });

            ws?.on("message", async (r) => await this.onMessage(r));
        } catch (e) {
            this._log(e);
        }
    }
    reconnect() {
        if (this.currentReconnectAttempts < this.maxReconnectAttempts) {
            if (DEV)
                this._log(
                    `Reconnecting in ${
                        this.reconnectInterval / 1000
                    } seconds...`
                );
            setTimeout(() => {
                this.currentReconnectAttempts++;
                if (DEV)
                    this._log(
                        `Reconnection attempt ${this.currentReconnectAttempts}/${this.maxReconnectAttempts}`
                    );
                this.initWs();
            }, this.reconnectInterval);
        } else {
            this._log(
                "Max reconnect attempts reached. Stopping reconnection attempts."
            );
        }
    }
    async handleTickers({ symbol, abot }: { abot: IArbitBot; symbol: string }) {
        //DONT RESUME IF RETURN TRUE
        try {
            botLog(abot.bot, "\nTickerHandler");
            const MAX_SLIP = 0.5;

            const { bot, pairA, pairB, pairC, bookA, bookB, bookC } = abot;
            let symbolA = getSymbol(abot.pairA, bot.platform);
            let symbolB = getSymbol(abot.pairB, bot.platform);
            let symbolC = getSymbol(abot.pairC, bot.platform);

            // CHECK IF TICKER IS CLOSE ENOUGH TO ASK OR BID
            if (bookA == undefined || bookB == undefined || bookC == undefined)
                return;

            const A = 1;
            // USE [ask, ask, bid]
            let pxA = bookA.ask.px;
            let pxB = bookB.ask.px;
            let pxC = bookC.bid.px;
            const A2 = (A * pxC) / (pxA * pxB);

            const perc = Number((((A2 - A) / A) * 100).toFixed(2));
            const flipped = perc < 0;

            botLog(bot, pairA, pairB, pairC);
            botLog(bot, { flipped });
            botLog(bot, { perc: `${perc}%`, pxA, pxB, pxC });

            if (Math.abs(perc) >= bot.arbit_settings!.min_perc) {
                // NOW CHECK IF THERE IS ENOUGH SIZES
                let szA = 0,
                    szB = 0,
                    szC = 0,
                    amt = 0;
                let availSzA = 0,
                    availSzB = 0,
                    availSzC = 0;

                if (flipped) {
                    pxC = bookC.ask.px; // BUY
                    pxB = bookB.bid.px; // SELL
                    pxA = bookA.bid.px; // SELL

                    availSzC = bookC.ask.amt;
                    availSzB = bookB.bid.amt;
                    availSzA = bookA.bid.amt;

                    const _botA = await Bot.findById(bot.children[0]).exec();
                    if (!_botA) return botLog(bot, "NO BOT A");
                    let order = await getLastOrder(_botA);
                    amt = bot.balance;

                    szC = amt / pxC;
                    szB = szC;
                    szA = szB * pxB;
                } else {
                    pxA = bookA.ask.px; // BUY
                    pxB = bookB.ask.px; // BUY
                    pxC = bookC.bid.px; // SELL

                    availSzA = bookA.ask.amt;
                    availSzB = bookB.ask.amt;
                    availSzC = bookC.bid.amt;

                    const _botC = await Bot.findById(bot.children[2]).exec();
                    if (!_botC) return botLog(bot, "NO BOT C");
                    let order = await getLastOrder(_botC);
                    amt = bot.balance;

                    szA = amt / pxA;
                    szB = szA / pxB;
                    szC = szB;
                }

                botLog(bot, { pxA, pxB, pxC });
                botLog(bot, { availSzA, availSzB, availSzC });
                botLog(bot, { szA, szB, szC });
                if (availSzA > szA && availSzB > szB && availSzC > szC) {
                    botLog(bot, "WS: ALL GOOD, GOING IN...");
                    // DOUBLE-CHECK IF BOT IS ACTIVE
                    const _bot = await Bot.findById(bot.id).exec();
                    if (!_bot || !_bot.active) {
                        botLog(bot, "REMOVING BOT...", {
                            notBot: !_bot,
                            active: _bot?.active,
                        });
                        if (!_bot) {
                            this.rmvBot(bot.id);
                        }
                        return false;
                    }
                    const params = {
                        bot: _bot,
                        pairA,
                        pairB,
                        pairC,
                        perc,
                        cPxA: pxA,
                        cPxB: pxB,
                        cPxC: pxC,
                    };
                    await deactivateBot(bot);
                    const res = flipped
                        ? await placeArbitOrdersFlipped(params)
                        : await placeArbitOrders(params);
                    /* END PLACE ORDERS */
                    await bot.save();
                    if (!res) return botLog(bot, "FAILED TO PLACE ORDERS");
                    botLog(bot, "ALL ORDERS PLACED SUCCESSFULLY!!");
                    await reactivateBot(bot);

                    // RE-FRESH BOT
                    const _botFinal = await Bot.findById(bot.id).exec();
                    if (!_botFinal) return false;
                    this._updateBots({ ...abot, bot: _botFinal });
                    await sleep(SLEEP_MS);
                    return bot.id;
                }
            }

            if (!this.arbitBots.find((el) => el.bot.id)) return false;

            this.arbitBots = this.arbitBots.map((abot2) => {
                return abot2.bot.id == abot.bot.id ? abot : abot2;
            });
            return true;
        } catch (e) {
            this._log(e);
            return false;
        }
    }
    async addBot(bot: IBot, first = true) {
        this._log("ADDING BOT", bot.name);
        try {
            const pricePrecision = getPricePrecision(
                [bot.base, bot.ccy],
                bot.platform
            );
            if (pricePrecision == null) return;
            if (this.ws?.readyState != this.ws?.OPEN) {
                await this.initWs();
            } 
            this.arbitBots = this.arbitBots.filter((el) => el.bot.id != bot.id);
            const pairA = [bot.B, bot.A];
            const pairB = [bot.C, bot.B];
            const pairC = [bot.C, bot.A];

            this.arbitBots.push({
                bot: bot,
                pairA,
                pairB,
                pairC,
            });

            await this.sub(bot);

            if (first) {
            }
            this._log("BOT ADDED");
        } catch (e) {
            this._log(e);
        }
    }

    async sub(bot: IBot) {
        // SUB FOR A. B. C
        const abot = this.arbitBots.find((el) => el.bot.id == bot.id);
        if (abot) {
            if (!abot.order) {
                const _botC = await Bot.findById(bot.children[2]).exec();
                if (!_botC) return this._log("NO BOT C");

                let order = await getLastOrder(_botC);
                const bal = bot.balance;
                abot.order = order ?? undefined;
                abot.startAmt = bal;
            }

            abot.active = true;
            this._updateBots(abot);
        }

        await this.subUnsub(bot, "sub");
    }

    async subUnsub(bot: IBot, act: "sub" | "unsub" = "sub") {
        let channel1: string | undefined; // Orderbook channel
        const { platform } = bot;
        const pairA = [bot.B, bot.A];
        const pairB = [bot.C, bot.B];
        const pairC = [bot.C, bot.A];

        let symbolA = getSymbol(pairA, bot.platform);
        let symbolB = getSymbol(pairB, bot.platform);
        let symbolC = getSymbol(pairC, bot.platform);
        switch (bot.platform) {
            case "okx":
                channel1 = "books5";
                break;
            case "bybit":
                channel1 = `orderbook.200.`;
                break;
            case "binance":
                channel1 = `orderbook.200.`;
                break;
            case "kucoin":
                channel1 = `/spotMarket/level2Depth5:`;
                break;
        }
        if (!this.ws) return;
        const fn =
            act == "sub"
                ? this.ws.sub.bind(this.ws)
                : this.ws.unsub.bind(this.ws);
        botLog(bot, `\n${act}ing...`);

        if (act == "unsub") {
            const abot = this.arbitBots.find((el) => el.bot.id == bot.id);
            if (abot) {
                abot.active = false;
                this._updateBots(abot);
            }
        }
        const activePairs: string[] = [];
        const activeBots = this.arbitBots.filter(
            (el) => el.active && el.bot.id != bot.id
        );
        for (let abot of activeBots) {
            activePairs.push(
                abot.pairA.toString(),
                abot.pairB.toString(),
                abot.pairC.toString()
            );
        }

        // if (pairs.includes())

        const unsubA =
            activePairs.findIndex((el) => el == pairA.toString()) == -1; // pairA not in any of active bots
        const unsubB =
            activePairs.findIndex((el) => el == pairB.toString()) == -1; // pairA not in any of active bots
        const unsubC =
            activePairs.findIndex((el) => el == pairC.toString()) == -1; // pairA not in any of active bots

        if (channel1) {
            // Orderbook channel, also returns ask n bid pxs
            if (platform == "okx") {
                if (act == "sub" || unsubA)
                    await fn(channel1, platform, { instId: symbolA });
                if (act == "sub" || unsubB)
                    await fn(channel1, platform, { instId: symbolB });
                if (act == "sub" || unsubC)
                    await fn(channel1, platform, { instId: symbolC });
            } else if (platform == "bybit" || platform == "kucoin") {
                if (act == "sub" || unsubA)
                    await fn(channel1 + symbolA, platform);
                if (act == "sub" || unsubB)
                    await fn(channel1 + symbolB, platform);
                if (act == "sub" || unsubC)
                    await fn(channel1 + symbolC, platform);
            }
        }
    }
    async unsub(bot: IBot) {
        await this.subUnsub(bot, "unsub");
    }
    async rmvBot(botId: mongoose.Types.ObjectId) {
        this._log("REMOVING BOT", botId, "...");
        const bot = this.arbitBots.find((el) => el.bot.id == botId);
        if (bot) {
            await this.unsub(bot.bot);
            this.arbitBots = this.arbitBots.filter((el) => el.bot.id != botId);
        }

        this._log("BOT REMOVED\n");
    }

    _updateBots(abot: IArbitBot) {
        this.arbitBots = this.arbitBots.map((el) =>
            el.bot.id == abot.bot.id ? abot : el
        );
    }

    _log(...args: any) {
        timedLog(`[WS][${this.plat}] `, ...args);
    }

    async onMessage(resp: RawData) {
        const r = this.parseData(resp);
        if (!r) return;
        const { channel, data, symbol } = r;
        //return;
        if (!symbol) return this._log("NO SYMBOL");

        for (let abot of this.arbitBots) {
            const { bot, pairA, pairB, pairC } = abot;
            let symbolA = getSymbol(pairA, bot.platform);
            let symbolB = getSymbol(pairB, bot.platform);
            let symbolC = getSymbol(pairC, bot.platform);

            if (channel == "orderbook" && this.plat == bot.platform) {
                // Determine whether to use the flipped or not
                const ob = data as IOrderbook;
                let enoughAsk: IBook | undefined;

                switch (symbol) {
                    case symbolA:
                        abot.bookA = {
                            ask: ob.asks[0],
                            bid: ob.bids[0],
                        };
                        break;
                    case symbolB:
                        abot.bookB = {
                            ask: ob.asks[0],
                            bid: ob.bids[0],
                        };
                        break;
                    case symbolC:
                        //this._log({ asks: ob.asks });
                        abot.bookC = {
                            ask: ob.asks[0],
                            bid: ob.bids[0],
                        };
                        break;
                }

                // Update bots
                this._updateBots(abot);
            }

            const { bookA, bookB, bookC } = abot;
            //this._log("\n", { plat: this.plat, pairC });
            //this._log({ bookC });
            //await sleep(SLEEP_MS);
            //return;

            if (bookA == undefined || bookB == undefined || bookC == undefined)
                return this._log("\nNO BOOK\n");

            // UNSUB FIRST
            //await this.unsub(abot.bot)
            if (abot.active) {
                abot.active = false;
                const re = await this.handleTickers({
                    abot,
                    symbol,
                });
                if (re != false) {
                    abot.active = true;
                }
                this._updateBots(abot);

                // if (re != false) {
                //     // RE-SUB
                //     this._log("\nRE-SUB\n");
                //     await this.sub(abot.bot);
                // }
            }

            //await sleep(SLEEP_MS);
        }
        //await sleep(SLEEP_MS);
    }

    parseData(resp: RawData) {
        const parsedResp = JSON.parse(resp.toString());
        let { data, topic, type } = parsedResp;
        let channel: string | undefined;
        let symbol: string | undefined;
        if (!data) {
            //this._log({ parsedResp });
            return;
        }

        switch (this.plat) {
            case "okx":
                channel = parsedResp.arg.channel;
                symbol = parsedResp.arg.instId;

                if (channel?.includes("book")) {
                    channel = "orderbook";
                    const ob: IOrderbook = {
                        ts: parseDate(Number(data[0].ts)),
                        bids: data[0].bids.map((el) => ({
                            px: Number(el[0]),
                            amt: Number(el[1]),
                            cnt: Number(el[3]),
                        })),
                        asks: data[0].asks.map((el) => ({
                            px: Number(el[0]),
                            amt: Number(el[1]),
                            cnt: Number(el[3]),
                        })),
                    };
                    data = ob;
                } else if (channel == "tickers") {
                    data = Number(data[0].last);
                }
                break;
            case "bybit":
                channel = parsedResp.topic;
                if (channel?.includes("orderbook")) {
                    channel = "orderbook";

                    symbol = data.s;
                    const ob: IOrderbook = {
                        ts: parseDate(Date.now()),
                        bids: data.b.map((el) => ({
                            px: Number(el[0]),
                            amt: Number(el[1]),
                            cnt: 1,
                        })),
                        asks: data.a.map((el) => ({
                            px: Number(el[0]),
                            amt: Number(el[1]),
                            cnt: 1,
                        })),
                    };

                    data = ob;
                }

                break;
            case "kucoin":
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

                    data = ob;
                }
                break;
        }

        if (!channel || !symbol) this._log("MISSING:", parsedResp);
        if (channel == "orderbook") {
            //SORT ORDERBOOK
            const ob: IOrderbook = data;
            //this._log({bids: ob.bids, asks: ob.asks})
            //data = { ...ob, asks: ob.asks.sort((a, b) => a.px - b.px), bids: ob.bids.sort((a, b) => b.px - a.px) };
        }
        return { channel: channel, symbol, data };
    }
}

export const wsTriArbits = {
    okx: new WsTriArbit("okx"),
    bybit: new WsTriArbit("bybit"),
    kucoin: new WsTriArbit("kucoin"),
};

export const initWsTriArbit = async () => {
    try {
        for (let ws of Object.values(wsTriArbits)) {
            await ws.initWs();
        }
    } catch (e) {
        timedLog("FAILED TO INIT WS");
        console.log(e);
    }
};
