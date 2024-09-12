import { WebSocket } from "ws";
import type { ClientOptions, RawData } from "ws";
import type { ClientRequest, ClientRequestArgs, IncomingMessage } from "http";
import {
    botLog,
    ceil,
    getPricePrecision,
    getSymbol,
    sleep,
    timedLog,
} from "@/utils/functions";
import {
    IABot,
    IBook,
    ICrossArbitBot,
    IObj,
    IOrderbook,
    IOrderpage,
} from "@/utils/interfaces";
import { parseDate } from "@/utils/funcs2";
import { DEV } from "@/utils/constants";
import {
    OKX_WS_URL_DEMO,
    OKX_WS_URL,
    BYBIT_WS_URL_DEMO,
    BYBIT_WS_URL,
    BINANCE_WS_URL,
    BITGET_WS_URL,
} from "@/utils/consts2";
import { IBot } from "@/models/bot";
import { KUCOIN_WS_URL } from "@/utils/funcs3";
import { Bot } from "@/models";
import {
    placeArbitOrdersFlipped,
    placeArbitOrders,
} from "@/utils/orders/funcs4";
import { Socket } from "socket.io";
import mongoose from "mongoose";
const readyStateMap = {
    0: "CONNECTING",
    1: "OPEN",
    2: "CLOSING",
    3: "CLOSED",
};

const SLEEP_MS = 10 * 1000;
const PAUSE_MS = 3 * 1000

export class TuWs extends WebSocket {
    channels: { channel: string; data: IObj; plat: string }[] = [];
    plat: string = "okx";
    lastSub: number;

    constructor(
        address: string | URL,
        options?: ClientOptions | ClientRequestArgs | undefined
    ) {
        super(address, options);
        this.lastSub = Date.now();
    }

    keepAlive(id?: string) {
        if (this.readyState === this.OPEN) {
            this.ping();
            if (DEV)
            console.log(`[ ${id ?? 'WS'} ] Ping sent to server\n`);
        }
    }

    async sub(channel: string, plat: string, data: IObj = {}) {
        console.log(
            "\n",
            { channel, state: readyStateMap[this.readyState] },
            "\n"
        );
        if (this.readyState != this.OPEN && false) {
            this.channels.push({ channel, data, plat });
        } else {
            if (Date.now() - this.lastSub < 3000) {
                await sleep(3000);
            }

            let json: IObj = {
                op: "subscribe",
                args: plat == "bybit" ? [channel] : [{ channel, ...data }],
            };

            switch (plat) {
                case "kucoin":
                    json = {
                        type: "subscribe",
                        topic: channel, //Topic needs to be subscribed. Some topics support to divisional subscribe the informations of multiple trading pairs through ",".
                        privateChannel: false, //Adopted the private channel or not. Set as false by default.
                        response: true,
                    };
                    break;
            }
            this.send(JSON.stringify(json));
            this.lastSub = Date.now();
        }
    }

    unsub(channel: string, plat: string, data: IObj = {}) {
        console.log(`\nUNSUSCRIBING FROM ${channel}`, data, "\n");
        let json: IObj = {
            op: "unsubscribe",
            args: plat == "bybit" ? [channel] : [{ channel, ...data }],
        };

        switch (plat) {
            case "kucoin":
                json = {
                    type: "unsubscribe",
                    topic: channel, //Topic needs to be subscribed. Some topics support to divisional subscribe the informations of multiple trading pairs through ",".
                    privateChannel: false, //Adopted the private channel or not. Set as false by default.
                    response: true,
                };
                break;
        }
        this.send(JSON.stringify(json));
    }
}

export class CrossArbitData {
    platA: string | undefined;
    platB: string | undefined;
    pair: string[] = [];
    bookA: IOrderpage | undefined;
    bookB: IOrderpage | undefined;
}

const demo = false;

export class TuArbitWs {
    arbitType: "tri" | "cross";
    ws: TuWs | undefined;
    abots: (ICrossArbitBot | IABot)[] = [];
    isConnectError = false;
    wsURL: string | undefined;
    open = false;
    name: string;
    plat: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    currentReconnectAttempts: number;
    PING_INTERVAL = 10 * 1000;

    constructor(plat: string, type: "tri" | "cross") {
        this.name = this.constructor.name;
        this.arbitType = type
        this.plat = plat.toLowerCase();
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
            case "bitget":
                this.wsURL = BITGET_WS_URL;
                break;
            case "kucoin":
                this.wsURL = "url";
                break;
        }
    }

    async initWs() {
        try {
            if (!this.wsURL) return this._log("WS URL UNDEFINED");
            this._log("initWs()");
            //if (this.ws?.readyState == this.ws?.OPEN) this.ws?.close();

            this.isConnectError = false;
            if (this.plat.toLocaleLowerCase() == "kucoin") {
                this.wsURL = await KUCOIN_WS_URL();
            }
            this.ws = new TuWs(this.wsURL);
            this.ws.plat = this.plat;
            if (!this.open) this._log("INIT WS");

            this.ws?.on("open", async () => {
                if (!this.ws) return this._log("ON OPEN: BUT NO WS");
                this._log("ON OPEN");
                for (let abot of this.abots) {
                    console.log("RESUBING FOR BOT: ", abot.bot.id);
                    await this.sub(abot.bot);
                }
                this.ws.channels = [];
                this.currentReconnectAttempts = 0;
                this.open = true;
                setInterval(() => this.ws?.keepAlive(`${this.arbitType}__${this.plat}`), this.PING_INTERVAL);
            });
            this.ws?.on("error", async (e) => {
                this._log("ON ERROR", e);
                this.isConnectError = e.stack?.split(" ")[2] == "ENOTFOUND";
            });
            this.ws?.on("close", async (code, rsn) => {
                this._log(`[onClose] CODE: ${code}\nREASON: ${rsn}`);
                // if (!this.isConnectError) await this.initWs();
                this.reconnect();
            });

            this.ws?.on("message", async (r) => await this.onMessage(r));
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

    _log(...args: any) {
        timedLog(`[WS][${this.plat}] `, ...args);
    }

    getBookChannelName() {
        let channel = "";

        switch (this.plat) {
            case "okx":
            case "bitget":
                channel = "books5";
                break;
            case "bybit":
                channel = `orderbook.200.`;
                break;
            case "binance":
                channel = `orderbook.200.`;
                break;
            case "kucoin":
                channel = `/spotMarket/level2Depth5:`;
                break;
        }
        return channel;
    }

    async kill() {
        for (let abot of this.abots.filter(el=> el.demo)) {
            await this.subUnsub(abot.bot, "unsub");
        }
        this.abots = [];
    }

    parseData(resp: any) {
        const parsedResp = JSON.parse(resp.toString());
        let { data, topic, type } = parsedResp;
        let channel: string | undefined;
        let symbol: string | undefined;
        if (!data) {
            this._log({ parsedResp });
            return;
        }

        switch (this.plat) {
            case "okx":
            case "bitget":
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
                    const d = data;
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
        //console.log(data)

        if (!channel || !symbol) this._log("MISSING:", parsedResp);
        if (channel == "orderbook") {
            //SORT ORDERBOOK
            const ob: IOrderbook = data;
            //this._log({bids: ob.bids, asks: ob.asks})
            //data = { ...ob, asks: ob.asks.sort((a, b) => a.px - b.px), bids: ob.bids.sort((a, b) => b.px - a.px) };
        }
        //console.log("AFTER DATA\n")
        return { channel: channel, symbol, data };
    }

    /**
     *
     * @param bot An arbitrage bot with A, B, and C
     */
    async sub(bot: IBot) {
        // SUB FOR A. B. C
        const abot = this.abots.find((el) => el.bot.id == bot.id);
        if (abot) {
            abot.active = true;
            this._updateBots(abot);
        }
        await this.subUnsub(bot, "sub");
    }

    async subUnsub(bot: IBot, act: "sub" | "unsub" = "sub") {
        const channel1 = this.getBookChannelName(); // Orderbook channel

        if (act == "sub" && !this.ws) {
            await this.initWs();
            //return await this.subUnsub(bot, act)
        }
        const fn =
            act == "sub"
                ? this.ws?.sub.bind(this.ws)
                : this.ws?.unsub.bind(this.ws);
        console.log(`\n${act.toUpperCase()}ING...`);
        if (act == "unsub") {
            const abot = this.abots.find((el) => el.bot.id == bot.id);
            if (abot) {
                abot.active = false;
                this._updateBots(abot);
            }
        }

        if (this.arbitType == "cross")
            await this._subUnsubCross(bot, act, channel1, fn);
        else await this._subUnsubTri(bot, act, channel1, fn);
    }

    async _subUnsubTri(
        bot: IBot,
        act: "sub" | "unsub",
        channel1: string,
        fn: ((channel: string, plat: string, data?: IObj) => void) | undefined
    ) {
        const { platform } = bot;
        const pairA = [bot.B, bot.A];
        const pairB = [bot.C, bot.B];
        const pairC = [bot.C, bot.A];

        let symbolA = getSymbol(pairA, bot.platform);
        let symbolB = getSymbol(pairB, bot.platform);
        let symbolC = getSymbol(pairC, bot.platform);
        const activePairs: string[] = [];
        const activeBots: IABot[] = this.abots.filter(
            (el) => el.active && el.bot.id != bot.id
        ) as any;
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
        if (this.ws?.readyState != this.ws?.OPEN) {
            return this._log("NOT READY");
        }
        if (channel1 && fn) {
            // Orderbook channel, also returns ask n bid pxs
            if (platform == "okx" || platform == "bitget") {
                if (act == "sub" || unsubA)
                    fn(channel1, platform, {
                        instId: symbolA,
                        instType: "SPOT",
                    });
                if (act == "sub" || unsubB)
                    fn(channel1, platform, {
                        instId: symbolB,
                        instType: "SPOT",
                    });
                if (act == "sub" || unsubC)
                    fn(channel1, platform, {
                        instId: symbolC,
                        instType: "SPOT",
                    });
            } else if (platform == "bybit" || platform == "kucoin") {
                if (act == "sub" || unsubA) fn(channel1 + symbolA, platform);
                if (act == "sub" || unsubB) fn(channel1 + symbolB, platform);
                if (act == "sub" || unsubC) fn(channel1 + symbolC, platform);
            }
        }
    }

    async _subUnsubCross(
        bot: IBot,
        act: "sub" | "unsub",
        channel1: string,
        fn: ((channel: string, plat: string, data?: IObj) => void) | undefined
    ) {
        const pair = [bot.base, bot.ccy];
        const symbol = getSymbol(pair, this.plat);
        const activePairs: string[] = [];
        const activeBots: ICrossArbitBot[] = this.abots.filter(
            (el) => el.active && el.bot.id != bot.id
        ) as any[];

        for (let abot of activeBots) {
            activePairs.push(abot.pair.toString());
        }

        // if (pairs.includes())

        const unsubPair =
            activePairs.findIndex((el) => el == pair.toString()) == -1; // pairA not in any of active bots

        if (this.ws?.readyState != this.ws?.OPEN) {
            return this._log("NOT READY");
        }
        if (channel1 && fn) {
            // Orderbook channel, also returns ask n bid pxs

            switch (this.plat) {
                case "okx":
                case "bitget":
                    if (act == "sub" || unsubPair)
                        fn(channel1, this.plat, {
                            instId: symbol,
                            instType: "SPOT",
                        });

                    break;
                case "bybit":
                case "kucoin":
                    if (act == "sub" || unsubPair)
                        fn(channel1 + symbol, this.plat);
                    break;
            }
        }
    }
    async unsub(bot: IBot) {
        await this.subUnsub(bot, "unsub");
    }
    async onMessage(resp: RawData) {
        const r = this.parseData(resp);
        if (!r) return;
        const { channel, data, symbol } = r;
        //return;
        if (!symbol) return this._log("NO SYMBOL");
        if (this.arbitType == 'tri') await this._onMessageTri(r)
        if (this.arbitType == 'cross') await this._onMessageCross(r)
    }

    async _onMessageTri(r: ReturnType<typeof this.parseData>) {
        if (!r) return;
        for (let abot of this.abots as IABot[]) {
            const { bot, pairA, pairB, pairC } = abot;
            let symbolA = getSymbol(pairA, bot.platform);
            let symbolB = getSymbol(pairB, bot.platform);
            let symbolC = getSymbol(pairC, bot.platform);

            const { channel, symbol, data } = r;

            if (channel == "orderbook" && this.plat == bot.platform) {
                // Determine whether to use the flipped or not
                const ob = data as IOrderbook;
                let enoughAsk: IBook | undefined;
                const {
                    bookA: oldBookA,
                    bookB: oldBookB,
                    bookC: oldBookC,
                } = abot;
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

                const { bookA, bookB, bookC } = abot;
                //this._log("\n", { plat: this.plat, pairC });
                //this._log({ bookC });
                //await sleep(SLEEP_MS);
                //return;

                if (
                    bookA == undefined ||
                    bookB == undefined ||
                    bookC == undefined
                ) {
                    this._log("\nNO BOOK\n");
                    return;
                }
                //this._log({ bookA, bookB, bookC });
                //await sleep(5000)
                // UNSUB FIRST
                //await this.unsub(abot.bot)
                const bookCond =
                    oldBookA != bookA || oldBookB != bookB || oldBookC != bookC;

                const bookFieldsCond =
                    bookA.bid &&
                    bookA.ask &&
                    bookB.bid &&
                    bookB.ask &&
                    bookC.bid &&
                    bookC.ask;

                if (abot.active && bookCond) {
                    abot.active = false;
                    const re = await this.handleTickersTri({
                        abot,
                    });

                    if (re != false) {
                        {
                            await sleep(PAUSE_MS);
                            abot.active = true;
                        }
                    } else {
                        this._log("NOT RESUMING");
                    }
                    this._updateBots(abot);
                } else if (abot.active) {
                    if (DEV) console.log({ bookA, bookB, bookC });
                }
            }
        }
    }
    async _onMessageCross(r: ReturnType<typeof this.parseData>) {
        if (!r) return;
        const { channel, symbol, data } = r;
        //return;
        if (!symbol) return this._log("NO SYMBOL");
        //console.log({abots: this.abots.length}, '\n')
        for (let abot of this.abots as ICrossArbitBot[]) {
            const { bot, pair } = abot;
            const { platA, platB } = bot;

            let symbolA = getSymbol(pair, platA);
            let symbolB = getSymbol(pair, platB);

            if (
                channel == "orderbook" &&
                (this.plat == platA || this.plat == platB)
            ) {
                // Determine whether to use the flipped or not
                const ob = data as IOrderbook;
                let enoughAsk: IBook | undefined;
                const { bookA: oldBookA, bookB: oldBookB } = abot.data;
                switch (this.plat) {
                    case platA:
                        abot.data.bookA = {
                            ask: ob.asks[0],
                            bid: ob.bids[0],
                        };
                        break;
                    case platB:
                        abot.data.bookB = {
                            ask: ob.asks[0],
                            bid: ob.bids[0],
                        };
                        break;
                }

                //console.log({symbol, symbolA, symbolB, plat: this.plat})
                // Update bots
                this._updateBots(abot);

                const { bookA, bookB } = abot.data;
                //this._log("\n", { plat: this.plat, pairC });
                //this._log({ bookC });
                //await sleep(SLEEP_MS);
                //return;

                if (bookA == undefined || bookB == undefined) {
                    this._log("\nNO BOOK\n");
                    return;
                }
                //this._log({ bookA, bookB, bookC });
                //await sleep(5000)
                // UNSUB FIRST
                //await this.unsub(abot.bot)
                const bookCond = oldBookA != bookA || oldBookB != bookB;

                const bookFieldsCond =
                    bookA.bid && bookA.ask && bookB.bid && bookB.ask;

                if (abot.active && bookCond && bookFieldsCond) {
                    abot.active = false;
                    const re = await this.handleTickersCross({
                        abot,
                    });

                    if (re != false) {
                        await sleep(PAUSE_MS)
                        abot.active = true;
                    } else {
                        this._log("NOT RESUMING");
                    }
                    this._updateBots(abot);
                } else if (abot.active) {
                    //if (DEV) console.log({ bookA, bookB });
                }
            }
        }
    }

    _updateBots(abot: ICrossArbitBot | IABot) {
        this.abots = this.abots.map((el) =>
            el.bot.id == abot.bot.id ? abot : el
        );
    }

    async handleTickersCross({ abot }: { abot: ICrossArbitBot }) {
        //DONT RESUME IF RETURN TRUE
        try {
            botLog(abot.bot, "\nTickerHandler");
            const { bot, pair, data } = abot;
            const { platA, platB } = bot;
            const { bookA, bookB } = data;

            // CHECK IF TICKER IS CLOSE ENOUGH TO ASK OR BID

            const A = 1;
            //Normal prices
            let pxA = bookA?.ask.px ?? 0;
            let pxB = bookB?.ask.px ?? 0;

            //Flipped prices
            let fpxB = bookB?.bid.px ?? 0;
            let fpxA = bookA?.bid.px ?? 0;

            const A2 = (A * pxB) / pxA; // BUY A, BUY B, SELL C
            const FA2 = (A * fpxA) / fpxB; //BUY C, SELL B, SELL A

            const _perc = ceil(((A2 - A) / A) * 100, 2);
            const _fperc = ceil(((FA2 - A) / A) * 100, 2);
            const perc = Math.max(_perc, _fperc);

            const flipped = _perc < _fperc;

            console.log({ platA, platB, pair }, "\n", { pxA, pxB }, "\n", {
                fpxA,
                fpxB,
            });

            console.log({ _perc: `${_perc}%`, _fperc: `${_fperc}%`, flipped });
            abot.client?.emit("/client-ws/book", {
                type: "cross",
                bookA,
                bookB,
                pair,
                platA,
                platB,
                perc: _perc,
                fperc: _fperc,
            });
        } catch (e) {
            this._log(e);
            return false;
        }
    }
    async handleTickersTri({ abot }: { abot: IABot }) {
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
            //Normal prices
            let pxA = bookA.ask.px;
            let pxB = bookB.ask.px;
            let pxC = bookC.bid.px;

            //Flipped prices
            let fpxC = bookC.ask.px;
            let fpxB = bookB.bid.px;
            let fpxA = bookA.bid.px;

            const A2 = (A * pxC) / (pxA * pxB); // BUY A, BUY B, SELL C
            const FA2 = (A * fpxA * fpxB) / fpxC; //BUY C, SELL B, SELL A

            const _perc = ceil(((A2 - A) / A) * 100, 2);
            const _fperc = ceil(((FA2 - A) / A) * 100, 2);
            const perc = Math.max(_perc, _fperc);

            const flipped = _perc < _fperc;

            botLog(bot, pairA, pairB, pairC, "\n", { pxA, pxB, pxC }, "\n", {
                fpxA,
                fpxB,
                fpxC,
            });

            botLog(bot, { _perc: `${_perc}%`, _fperc: `${_fperc}%`, flipped });
            if (!abot.demo) {
                if (this.plat == "kucoin" && bot.demo) {
                    await sleep(5000);
                    return true;
                }

                if (perc >= bot.arbit_settings!.min_perc) {
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

                        amt = bot.balance;

                        szA = amt / pxA;
                        szB = szA / pxB;
                        szC = szB;
                    }

                    botLog(
                        bot,
                        { pxA, pxB, pxC },
                        "\n",
                        { availSzA, availSzB, availSzC },
                        "\n",
                        { szA, szB, szC }
                    );

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
                        //await deactivateBot(bot);
                        abot.active = false;
                        this._updateBots(abot);
                        const res = flipped
                            ? await placeArbitOrdersFlipped(params)
                            : await placeArbitOrders(params);
                        /* END PLACE ORDERS */
                        await bot.save();
                        if (!res) return botLog(bot, "FAILED TO PLACE ORDERS");
                        botLog(bot, "ALL ORDERS PLACED SUCCESSFULLY!!");
                        //await reactivateBot(bot);

                        // RE-FRESH BOT
                        const _botFinal = await Bot.findById(bot.id).exec();
                        if (!_botFinal) return false;
                        this._updateBots({ ...abot, bot: _botFinal });
                        abot.active = true;
                        this._updateBots(abot);
                        return bot.id;
                    }
                }

                if (!this.abots.find((el) => el.bot.id)) {
                    this._log("ARBIT BOT NO LONGER IN BOTS");
                    return false;
                }

                // this.abots = this.abots.map((abot2) => {
                //     return abot2.bot.id == abot.bot.id ? abot : abot2;
                // });
            } else if (abot.client) {
                abot.client.emit("/client-ws/book", {
                    type: "tri",
                    bookA,
                    bookB,
                    bookC,
                    pairA,
                    pairB,
                    pairC,
                    perc: _perc,
                    fperc: _fperc,
                });
            }
            abot.active = true;
            this._updateBots(abot);
            return true;
        } catch (e) {
            this._log(e);
            return false;
        }
    }
    async addBot(bot: IBot, client?: Socket, demo?: boolean, data?: CrossArbitData) {
        this._log("ADDING BOT", bot.name);
        try {
            const pricePrecision = getPricePrecision(
                [bot.base, bot.ccy],
                bot.platform
            );
            if (pricePrecision == null) return;
            if (this.ws?.readyState != this.ws?.OPEN) {
                await this.initWs();
                //return await this.addBot(bot, first)
            }
            this.abots = this.abots.filter((el) => el.bot.id != bot.id);
            if (this.arbitType == "tri") {
                const pairA = [bot.B, bot.A];
                const pairB = [bot.C, bot.B];
                const pairC = [bot.C, bot.A];

                this.abots.push({
                    bot: bot,
                    pairA,
                    pairB,
                    pairC,
                    client,
                    demo,
                    active: true,
                });
            } else {
                const pair = [bot.base, bot.ccy];
                this.abots.push({
                    bot: bot,
                    pair,
                    client,
                    demo,
                    active: true,
                    data: data!
                });
            }

            await this.sub(bot);
            this._log("BOT ADDED");
        } catch (e) {
            this._log(e);
        }
    }
    async rmvBot(botId: mongoose.Types.ObjectId) {
        this._log("REMOVING BOT", botId, "...");
        const bot = this.abots.find((el) => el.bot.id == botId);
        if (bot) {
            await this.unsub(bot.bot);
            this.abots = this.abots.filter((el) => el.bot.id != botId);
        }

        this._log("BOT REMOVED\n");
    }
}

