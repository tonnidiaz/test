import { IBot } from "@/models/bot";
import {
    botLog,
    ceil,
    getPricePrecision,
    getSymbol,
    sleep,
    timedLog,
} from "@/utils/functions";
import { IOpenBot, IOrderbook } from "@/utils/interfaces";
import { TuWs } from "./tu";
import { DEV, TP } from "@/utils/constants";
import { Bot } from "@/models";
import mongoose, { ObjectId } from "mongoose";
import { Bybit } from "./bybit";
import { parseDate } from "@/utils/funcs2";
import { placeArbitOrders } from "@/utils/orders/funcs4";
import { deactivateBot, reactivateBot } from "@/utils/funcs3";

const OKX_WS_URL = "wss://ws.okx.com:8443/ws/v5/public";
const OKX_WS_URL_DEMO = "wss://wspap.okx.com:8443/ws/v5/public";

const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/spot";
const BYBIT_WS_URL_DEMO = "wss://stream-testnet.bybit.com/v5/public/spot";

const demo = true;

interface IArbitBot {
    bot: IBot;
    pxA?: number;
    pxB?: number;
    pxC?: number;
    askA?: number;
    bidA?: number;
    askB?: number;
    bidB?: number;
    askC?: number;
    bidC?: number;
    pairA: string[];
    pairB: string[];
    pairC: string[];
}

export class WsArbit {
    name: string;
    ws: TuWs | undefined;
    ok: boolean = false;
    arbitBots: IArbitBot[] = [];
    isConnectError = false;
    wsURL: string | undefined;
    open = false;

    constructor(plat: string) {
        this.name = this.constructor.name;
        console.log(this.name);
        switch (plat) {
            case "okx":
                this.wsURL = demo ? OKX_WS_URL_DEMO : OKX_WS_URL;
                break;
            case "bybit":
                this.wsURL = demo ? BYBIT_WS_URL_DEMO : BYBIT_WS_URL;
                break;
        }
    }

    async initWs() {
        try {
            if (!this.wsURL) return this._log("WS URL UNDEFINED");

            if (this.ws?.readyState == this.ws?.OPEN) this.ws?.close();

            this.isConnectError = false;
            this.ws = new TuWs(this.wsURL);
            this._log("INIT WS");
            const ws = this.ws;

            ws?.on("open", () => {
                if (!this.ws) return;

                this._log("ON OPEN");
                for (let ch of ws.channels) {
                    this.ws.sub(ch.channel, ch.data);
                }
                this.ws.channels = [];

                this.open = true;
            });
            ws?.on("error", async (e) => {
                this._log("ON ERROR", e);
                this.isConnectError = e.stack?.split(" ")[2] == "ENOTFOUND";
                await sleep(2000);
            });
            ws?.on("close", async (e) => {
                this.open = false;
                this._log("ON CLOSED", e);
                if (!this.isConnectError) await this.initWs();
            });

            ws?.on("message", async (resp) => {
                const { channel, data, symbol } = ws?.parseData(resp);
                if (DEV) {
                    if (!data) return this._log("NO DATA");
                    if (channel == "books5") {
                        const res = data;
                        const ob: IOrderbook = {
                            ts: parseDate(Number(res[0].ts)),
                            bids: res[0].bids.map((el) => ({
                                px: Number(el[0]),
                                amt: Number(el[1]),
                                cnt: Number(el[3]),
                            })),
                            asks: res[0].asks.map((el) => ({
                                px: Number(el[0]),
                                amt: Number(el[1]),
                                cnt: Number(el[3]),
                            })),
                        };
                        console.log(ob);
                    } else if (channel == "tickers") {
                        const ticker = data[0];
                        const px = Number(ticker["last"]);
                        const ask = Number(ticker["askPx"]);
                        const bid = Number(ticker["bidPx"]);
                        const symbol = ticker["instId"];
                        const args = { instId: symbol };
                        console.log("\nON TICKERS");
                        this.ws?.unsub(channel, args);
                        for (let abot of this.arbitBots) {
                            const re = await this.handleTickers({
                                px,
                                ask,
                                bid,
                                symbol,
                                abot,
                            });
                            if (re != false) {
                                // RE-SUB
                                await sleep(2000);
                                this._log("\nRE-SUB\n");
                                this.ws?.sub(channel, args);
                            }
                        }
                    }
                    //timedLog(candle);
                }
            });
        } catch (e) {
            console.log(e);
        }
    }

    async handleTickers({
        px,
        symbol,
        ask,
        bid,
        abot,
    }: {
        abot: IArbitBot;
        px: number;
        ask: number;
        bid: number;
        symbol: string;
    }) {
        //DONT RESUME IF RETURN TRUE
        try {
            // this._log({ symbol, px, ask, bid });

            const MAX_SLIP = 0.5;

            const { bot, pairA, pairB, pairC } = abot;
            let symbolA = getSymbol(abot.pairA, bot.platform);
            let symbolB = getSymbol(abot.pairB, bot.platform);
            let symbolC = getSymbol(abot.pairC, bot.platform);

            switch (symbol) {
                case symbolA:
                    abot.pxA = px;
                    abot.askA = ask;
                    abot.bidA = bid;
                    break;
                case symbolB:
                    abot.pxB = px;
                    abot.askB = ask;
                    abot.bidB = bid;
                    break;
                case symbolC:
                    abot.pxC = px;
                    abot.askC = ask;
                    abot.bidC = bid;
                    break;
            }

            // CHECK IF TICKER IS CLOSE ENOUGH TO ASK OR BID
            const { pxA, pxB, pxC, askA, askB, bidC } = abot;
            if (
                pxA == undefined ||
                pxB == undefined ||
                pxC == undefined ||
                askA == undefined ||
                askB == undefined ||
                bidC == undefined
            )
                return;
            this._log({ pxA, pxB, pxC, askA, askB, bidC });
            const A1 = 1;
            const _baseA = A1 / pxA;
            const _baseB = _baseA / pxB;
            const A2 = _baseB * pxC;

            const perc = Number((((A2 - A1) / A1) * 100).toFixed(2));
            if (perc >= bot.arbit_settings!.min_perc) {
                const pxFromAskA = ceil(((askA - pxA) / pxA) * 100, 2);
                const pxFromAskB = ceil(((askB - pxB) / pxB) * 100, 2);
                const pxFromBidC = ceil(((pxC - bidC) / bidC) * 100, 2);
                botLog(bot, {
                    perc: `${perc}%`,
                    pxFromAskA,
                    pxFromAskB,
                    pxFromBidC,
                });
                if (
                    pxFromAskA <= MAX_SLIP &&
                    pxFromAskB <= MAX_SLIP &&
                    pxFromBidC <= MAX_SLIP
                ) {
                    botLog(bot, "WS: ALL GOOD, GOING IN...");
                    // DOUBLE-CHECK IF BOT IS ACTIVE
                    const _bot = await Bot.findById(bot.id).exec();
                    if (!_bot || !_bot.active) {
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
                    const res = await placeArbitOrders(params);
                    if (res) await reactivateBot(bot);
                    return res ? true : false;
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
            console.log(e);
        }
    }

    async sub(bot: IBot) {
        // SUB FOR A. B. C
        const pairA = [bot.B, bot.A];
        const pairB = [bot.C, bot.B];
        const pairC = [bot.C, bot.A];

        let symbolA = getSymbol(pairA, bot.platform);
        let symbolB = getSymbol(pairB, bot.platform);
        let symbolC = getSymbol(pairC, bot.platform);

        let channel1: string | undefined; // Tickers channel
        let channel2: string | undefined; // Orderbook channel

        switch (bot.platform) {
            case "okx":
                channel1 = "tickers";
                channel2 = "books5";
                break;
        }

        if (channel1) {
            // Tickers channel, also returns ask n bid pxs
            this.ws?.sub(channel1, { instId: symbolA });
            this.ws?.sub(channel1, { instId: symbolB });
            this.ws?.sub(channel1, { instId: symbolC });
        }
        if (channel2) {
            // this.ws?.sub(channel2, { instId: symbolA });
            // this.ws?.sub(channel2, { instId: symbolB });
            // this.ws?.sub(channel2, { instId: symbolC });
        }
    }
    async unsub(bot: IBot) {
        const pairA = [bot.B, bot.A];
        const pairB = [bot.C, bot.B];
        const pairC = [bot.C, bot.A];
        let symbolA = getSymbol(pairA, bot.platform);
        let symbolB = getSymbol(pairB, bot.platform);
        let symbolC = getSymbol(pairC, bot.platform);

        let channel1: string | undefined; // Tickers channel
        let channel2: string | undefined; // Orderbook channel

        switch (bot.platform) {
            case "okx":
                channel1 = "tickers";
                channel2 = "books5";
                break;
        }

        if (channel1) {
            // Tickers channel, also returns ask n bid pxs
            this.ws?.unsub(channel1, { instId: symbolA });
            this.ws?.unsub(channel1, { instId: symbolB });
            this.ws?.unsub(channel1, { instId: symbolC });
        }
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
    _log(...args: any) {
        timedLog(`[WS][${this.name}] `, ...args);
    }
}

export const wsPlats = {
    okx: new WsArbit("okx"),
    bybit: new WsArbit("bybit"),
};

export const initWsPlats = async () => {
    try {
        for (let ws of Object.values(wsPlats)) {
            await ws.initWs();
        }
    } catch (e) {
        timedLog("FAILED TO INIT WS");
        console.log(e);
    }
};
