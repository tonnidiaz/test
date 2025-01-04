import { IBot } from "@cmn/models/bot";
import { TuWs } from "./tu-ws";
import {
    botLog,
    getBookChannelName,
    getWsUrl,
} from "@cmn/utils/bend/functions";
import {
    ceil,
    getPricePrecision,
    getSymbol,
    parseDate,
    sleep,
    timedLog,
} from "@cmn/utils/functions";
import { getInstrus, KUCOIN_WS_URL, safeJsonParse } from "@cmn/utils/funcs3";
import { DEV } from "@cmn/utils/constants";
import { RawData } from "ws";
import {
    IBook,
    IObj,
    IOrderbook,
    IOrderpage,
    ITriArbitBot,
    TPlatName,
} from "@cmn/utils/interfaces";
import { Bot } from "@cmn/models";
import { placeArbitOrders, placeArbitOrdersFlipped } from "@cmn/utils/orders/funcs4";
import { Socket } from "socket.io";


const PAUSE_MS = 2 * 1000;

export let superMegaBots: TuMegaWs[] = []

interface IMiniBot {
    client?: Socket;
    active: boolean;
    A: string;
    B: string;
    C: string;
    bookA?: IOrderpage;
    bookB?: IOrderpage;
    bookC?: IOrderpage;
    id: string;
    tickerA?: number;
    tickerB?: number;
    tickerC?: number;
}

export class TuMegaWs {
    ws: TuWs | undefined;
    bot: IBot;
    wsUrl: string | undefined;
    open: boolean = false;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    currentReconnectAttempts: number;
    PING_INTERVAL = 10 * 1000;
    arbitType: "tri" | "cross" | "comp";
    plat: TPlatName;
    miniBots: IMiniBot[] = [];
    prevActiveMiniBots: IMiniBot[] = [];

    constructor({ bot }: { bot: IBot }) {
        this.bot = bot;

        this.reconnectInterval = 5000; // 5 seconds by default
        this.maxReconnectAttempts = 10; // Max reconnection attempts
        this.currentReconnectAttempts = 0;
        this.arbitType = bot.arbit_settings._type;
        this.plat = bot.platform;
        this.wsUrl = getWsUrl(this.plat, bot.demo);
    }

    async initWs() {
        this.log("Initializing Mega Ws...");
        if (!this.wsUrl) return this.log("WS URL UNDEFINED");

        if (this.plat.toLocaleLowerCase() == "kucoin") {
            this.wsUrl = await KUCOIN_WS_URL();
        }
        this.ws = new TuWs(this.wsUrl!, this.plat);
        this.ws.plat = this.plat;
        if (!this.open) this.log("INIT WS: NOT OPEN");

        this.ws?.on("open", async () => {
            if (!this.ws) return this.log("ON OPEN: BUT NO WS");

            this.log("ON OPEN");

            // Subscribe to necessary channels
            this.log("Sarabacribing...");
            await this.sub();

            this.ws.channels = [];
            this.currentReconnectAttempts = 0;
            this.open = true;
            setInterval(() => this.ws?.keepAlive(), this.PING_INTERVAL);
        });
        this.ws?.on("error" as any, async (e) => {
            this.log("ON ERROR", e);
            // this.isConnectError = e.stack?.split(" ")[2] == "ENOTFOUND";
        });
        this.ws?.on("close" as any, async (code, rsn) => {
            this.log(`[onClose] CODE: ${code}\nREASON: ${rsn}`);
            this.open = false;
            // if (!this.isConnectError) await this.initWs();
            this.reconnect();
        });

        this.ws?.on("message" as any, async (r) => await this.onMessage(r));
    }

    reconnect() {
        if (this.currentReconnectAttempts < this.maxReconnectAttempts) {
            if (DEV)
                this.log(
                    `Reconnecting in ${
                        this.reconnectInterval / 1000
                    } seconds...`
                );
            setTimeout(() => {
                this.currentReconnectAttempts++;
                if (DEV)
                    this.log(
                        `Reconnection attempt ${this.currentReconnectAttempts}/${this.maxReconnectAttempts}`
                    );
                this.initWs();
            }, this.reconnectInterval);
        } else {
            this.log(
                "Max reconnect attempts reached. Stopping reconnection attempts."
            );
        }
    }
    updateBot() {}

    async subUnsub(act: "sub" | "unsub" = "sub") {
        this.bot = await Bot.findById(this.bot.id).exec();

        act = this.bot.active && this.bot ? "sub" : "unsub";

        const channel1 = getBookChannelName(this.plat); // Orderbook channel
        this.log("subUnsub()");

        if (act == "sub" && !this.ws) {
            await this.initWs();
            //return await this.subUnsub(bot, act)
        }
        const fn =
            act == "sub"
                ? this.ws?.sub.bind(this.ws)
                : this.ws?.unsub.bind(this.ws);
        this.log(`${act.toUpperCase()}ING...`);
        if (act == "unsub") {
            // this.active = false;
            // this.updateBot();
        }

        // if (this.arbitType == "cross")
            // return await this.subUnsubCross(act, channel1, fn);
        // else 
        return await this.subUnsubTri( act, channel1, fn);
    }

    async sub() {
        // SUB FOR A. B. C
        if (!this.bot.active) {
            return this.log("BOT NOT ACTIVE");
        }
        await this.subUnsub("sub");
    }

    async subUnsubTri(
        act: "sub" | "unsub",
        channel1: string,
        fn:
            | ((channel: string, plat: TPlatName, data?: IObj) => Promise<void>)
            | undefined
    ) {
        /**
         * Get all instrus from bot this.plat
         * Instrus filtered by A (USDT) and B (USDC)
         * Subscribe to pair-specific channels
         * Save pairs to active pairs
         */

        // First check if pair [B,A] && [C, B] exist
        const { A, B } = this.bot;
        const pairs = getInstrus(this.plat).sort();

        if (!pairs.find((el) => el[0] == B && el[1] == A)) {
            const msg = `[${B}, ${A}] is not on ${this.plat}`;
            this.log(msg);
            throw new Error(msg);
        }

        // PairB [B, C]
        let bPairs = pairs.filter((el) => el[1] == B)
        if (DEV) bPairs = bPairs.slice(0, 3)
        for (let pairB of bPairs ) {
            const C = pairB[0];
            const pairA = [B, A],
                pairC = [C, A];

            if (
                !getPricePrecision(pairA, this.plat) ||
                !getPricePrecision(pairB, this.plat) ||
                !getPricePrecision(pairC, this.plat)
            ) {
                continue;
            }
            this.log(`${act == 'sub' ? 'Adding' : 'Removing'} ${pairB} ${pairC}...`);

            let symbolA = getSymbol(pairA, this.plat);
            let symbolB = getSymbol(pairB, this.plat);
            let symbolC = getSymbol(pairC, this.plat);
            // id = A-B-C (USDT-USDC-APEX)
            if (act == "sub")
                this.miniBots.push({
                    A: pairA.toString(),
                    B: pairB.toString(),
                    C: pairC.toString(),
                    id: `minibot-${A}-${B}-${C}`,
                    active: true
                });

            const unsubA = true ||
                this.miniBots.findIndex((el) => el.A == pairA.toString()) == -1; // pairA not in any of active bots
            const unsubB = true ||
                this.miniBots.findIndex((el) => el.B == pairB.toString()) == -1; // pairA not in any of active bots
            const unsubC = true ||
                this.miniBots.findIndex((el) => el.C == pairC.toString()) == -1; // pairA not in any of active bots
            // if (this.ws?.readyState != this.ws?.OPEN) {
            //     this.log("NOT READY");
            //    return;
            // }

                if (act == 'unsub')
                    this.log({unsubA, unsubB, unsubC});

            if (channel1 && fn) {
                // Orderbook channel, also returns ask n bid pxs
                if (this.plat == "okx" || this.plat == "bitget") {
                    if (act == "sub" || unsubA)
                        fn(channel1, this.plat, {
                            instId: symbolA,
                            instType: "SPOT",
                        });
                    if (act == "sub" || unsubB)
                        fn(channel1, this.plat, {
                            instId: symbolB,
                            instType: "SPOT",
                        });
                    if (act == "sub" || unsubC)
                        fn(channel1, this.plat, {
                            instId: symbolC,
                            instType: "SPOT",
                        });
                } else if (
                    this.plat == "bybit" ||
                    this.plat == "kucoin" ||
                    this.plat == "binance" ||
                    this.plat == "mexc"
                ) {
                    if (act == "sub" || unsubA)
                        fn(channel1 + symbolA, this.plat);
                    if (act == "sub" || unsubB)
                        fn(channel1 + symbolB, this.plat);
                    if (act == "sub" || unsubC)
                        fn(channel1 + symbolC, this.plat);
                }
            }
        }
        return this.bot.id
    }

    async subUnsubCross(
        act: "sub" | "unsub",
        channel1: string,
        fn:
            | ((channel: string, plat: TPlatName, data?: IObj) => void)
            | undefined
    ) {
        this.log({ channel1, fn });
    }

    parseData(resp: any) {
        const parsedResp = safeJsonParse(resp.toString());
        let { data, topic, d } = parsedResp;
        let channel: string | undefined;
        let symbol: string | undefined;
        if (
            (this.plat != "binance" && !data && !d) ||
            (this.plat == "binance" && !parsedResp.e)
        ) {
            if (parsedResp != "pong") this.log({ parsedResp });
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
            case "binance":
                if (parsedResp?.e) {
                    const e = parsedResp;

                    if (e.e == "depthUpdate") {
                        symbol = e.s;
                        channel = "orderbook";
                        const ob: IOrderbook = {
                            ts: parseDate(e.E),
                            asks: e.a.map((el) => ({
                                px: Number(el[0]),
                                amt: Number(el[1]),
                            })),
                            bids: e.b.map((el) => ({
                                px: Number(el[0]),
                                amt: Number(el[1]),
                            })),
                        };

                        data = ob;
                    }
                }
                break;
            case "mexc":
                if (parsedResp?.c) {
                    const e = parsedResp;

                    if (e.c.includes("depth")) {
                        symbol = e.s;
                        channel = "orderbook";
                        const ob: IOrderbook = {
                            ts: parseDate(e.t),
                            asks: e.d.asks.map((el) => ({
                                px: Number(el.p),
                                amt: Number(el.v),
                            })),
                            bids: e.d.bids.map((el) => ({
                                px: Number(el.p),
                                amt: Number(el.v),
                            })),
                        };

                        data = ob;
                    }
                }
                break;
        }


        if (!channel || !symbol) this.log("MISSING:", parsedResp);
        if (channel == "orderbook") {
            //SORT ORDERBOOK
            const ob: IOrderbook = data;
            //this.log({bids: ob.bids, asks: ob.asks})
            //data = { ...ob, asks: ob.asks.sort((a, b) => a.px - b.px), bids: ob.bids.sort((a, b) => b.px - a.px) };
        }
        return { channel: channel, symbol, data };
    }

    async onMessage(resp: RawData) {
        if (DEV) this.log("ON MESSAGE");
        const r = this.parseData(resp);
        if (!r) {
            if (DEV) this.log({ resp: resp.toString() });
            return;
        }
        const { channel, data, symbol } = r;
        //return;
        if (!symbol) return this.log("NO SYMBOL");
        if (this.arbitType == "tri") await this.onMessageTri(r);
        // if (this.arbitType == "cross") await this.onMessageCross(r);
    }

    async onMessageTri(r: ReturnType<typeof this.parseData>) {
        if (!r) return;
        for (let miniBot of this.miniBots) {
            if (!miniBot.active){
                if (DEV) this.log(`[${miniBot.id}] Mini-bot paused`)
                    continue
            }
            const pairA = miniBot.A.split(",");
            const pairB = miniBot.B.split(",");
            const pairC = miniBot.C.split(",");

            let symbolA = getSymbol(pairA, this.plat);
            let symbolB = getSymbol(pairB, this.plat);
            let symbolC = getSymbol(pairC, this.plat);

            const { channel, symbol, data } = r;

            if (channel == "orderbook") {
                // Determine whether to use the flipped or not
                let { bookA, bookB, bookC } = miniBot;
                const ob = data as IOrderbook;
                let enoughAsk: IBook | undefined;
                const askA = ob.asks[0] ?? bookA?.ask;
                const askB = ob.asks[0] ?? bookB?.ask;
                const askC = ob.asks[0] ?? bookC?.ask;

                const bidA = ob.bids[0] ?? bookA?.bid;
                const bidB = ob.bids[0] ?? bookB?.bid;
                const bidC = ob.bids[0] ?? bookC?.bid;
                const {
                    bookA: oldBookA,
                    bookB: oldBookB,
                    bookC: oldBookC,
                } = miniBot;

                switch (symbol) {
                    case symbolA:
                        miniBot.bookA = {
                            ask: askA,
                            bid: bidA,
                        };
                        break;
                    case symbolB:
                        miniBot.bookB = {
                            ask: askB,
                            bid: bidB,
                        };
                        break;
                    case symbolC:
                        //this.log({ asks: ob.asks });
                        miniBot.bookC = {
                            ask: askC,
                            bid: bidC,
                        };
                        break;
                }

                // Update bots
                // this.updateBot();
                //this.log("\n", { plat: this.plat, pairC });
                //this.log({ bookC });
                //await sleep(SLEEP_MS);
                //return;

                if (
                    miniBot.bookA == undefined ||
                    miniBot.bookB == undefined ||
                    miniBot.bookC == undefined
                ) {
                    this.log("\nNO BOOK\n");
                    return;
                }
                //this.log({ bookA, bookB, bookC });
                //await sleep(5000)
                // UNSUB FIRST
                //await this.unsub(abot.bot)
                const bookCond =
                    oldBookA != miniBot.bookA ||
                    oldBookB != miniBot.bookB ||
                    oldBookC != miniBot.bookC;

                const bookFieldsCond =
                    miniBot.bookA.bid &&
                    miniBot.bookA.ask &&
                    miniBot.bookB.bid &&
                    miniBot.bookB.ask &&
                    miniBot.bookC.bid &&
                    miniBot.bookC.ask;

                this.log({minBot: miniBot.id, bookCond, bookFieldsCond})
                if (miniBot.active && bookCond && bookFieldsCond) {
                    miniBot.active = false;
                    this.updateBot();
                    // await this.unsub(abot.bot);
                    const re = await this.handleTickersTri({
                        miniBot,
                    });

                    if (re != false) {
                        {
                            await sleep(PAUSE_MS);
                            miniBot.active = true;
                        }
                    } else {
                        this.log("NOT RESUMING");
                    }
                    this.updateBot();
                   await this.resumeBots(miniBot)
                } 
            }
        }
    }

     async resumeBots  (miniBot: IMiniBot){
        this.bot = await Bot.findById(this.bot._id).exec()
        if (!this.bot.active) {
            this.log('Not resuming bot')
            await this.rmvBot()
            
            return
        }
        this.miniBots = this.miniBots.map(el => ({...el, active: (el.id == miniBot.id && miniBot.active) || this.prevActiveMiniBots.findIndex(el2=> el2.id == el.id) != -1}))
        this.log(`Resuming ${this.miniBots.filter(el=> el.active).length} mini bots...`)
    }

    async handleTickersTri({ miniBot }: { miniBot: IMiniBot }) {
        //DONT RESUME IF RETURN TRUE
        try {
            const { A, B, C, bookA, bookB, bookC } = miniBot;
            if (DEV)
                botLog(this.bot, "\nTickerHandler Tri", { plat: this.plat, A, B, C });
            const MAX_SLIP = 0.5;
            
            const pairA = A.split(','), pairB = B.split(','), pairC = C.split(',');
            // CHECK IF TICKER IS CLOSE ENOUGH TO ASK OR BID
            if (bookA == undefined || bookB == undefined || bookC == undefined)
                return;

            const bot = this.bot;

            const START_AMT = 1;
            let tickerA = miniBot.tickerA ?? 0;
            let tickerB = miniBot.tickerB ?? 0;
            let tickerC = miniBot.tickerC ?? 0;
            //Normal prices
            let pxA = bookA.ask.px;
            let pxB = bookB.ask.px;
            let pxC = bookC.bid.px;

            //Flipped prices
            let fpxC = bookC.ask.px;
            let fpxB = bookB.bid.px;
            let fpxA = bookA.bid.px;

            const A2 = (START_AMT * pxC) / (pxA * pxB); // BUY A, BUY B, SELL C
            const FA2 = (START_AMT * fpxA * fpxB) / fpxC; //BUY C, SELL B, SELL A

            const _perc = ceil(((A2 - START_AMT) / START_AMT) * 100, 2);
            const _fperc = ceil(((FA2 - START_AMT) / START_AMT) * 100, 2);

            const tickerA2 = (START_AMT * tickerC) / (tickerA * tickerB);
            const ftickerA2 = (START_AMT * tickerA * tickerB) / tickerC;

            const tickerPerc = ceil(((tickerA2 - START_AMT) / START_AMT) * 100, 2);
            const ftickerPerc = ceil(((ftickerA2 - START_AMT) / START_AMT) * 100, 2);

            const perc = Math.max(_perc, _fperc);

            const flipped = _perc < _fperc;

            botLog(bot, pairA, pairB, pairC, "\n", { pxA, pxB, pxC }, "\n", {
                fpxA,
                fpxB,
                fpxC,
            });
            const { min_perc } =bot.arbit_settings!;

            botLog(bot, {
                min_perc,
                _perc: `${_perc}%`,
                _fperc: `${_fperc}%`,
                flipped,
            });
                if (perc >= min_perc) {
                    // Pause all miniBots
                    // Save active statues first
                    this.log(`[${miniBot.id}] entry condition met. Pausing all miniBots....\n`)
                    this.prevActiveMiniBots = this.miniBots.filter(el=> el.active && el.id != miniBot.id)
                    this.miniBots = this.miniBots.map(el=> ({...el, active: false}))

                    

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
                                this.rmvBot();
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
                        miniBot.active = false;
                        // this._updateBots(miniBot);
                        const res = flipped
                            ? await placeArbitOrdersFlipped(params)
                            : await placeArbitOrders(params);
                        /* END PLACE ORDERS */
                        if (DEV) await sleep(5000)
                        await bot.save();
                        if (!res) {
                            return this.log(`[${miniBot.id}]`,"FAILED TO PLACE ORDERS");}
                        this.log(`[${miniBot.id}]`,"ALL ORDERS PLACED SUCCESSFULLY!!");
                        //await reactivateBot(bot);

                        // RE-FRESH BOT
                        const _botFinal = await Bot.findById(bot.id).exec();
                        if (!_botFinal) return false;
                        this.bot = _botFinal
                        // this._updateBots({ ...miniBot, bot: _botFinal });
                        miniBot.active = true;
                        // this._updateBots(miniBot);
                        return bot.id;
                    }
                    
                    
                }

                // if (!this.abots.find((el) => el.bot.id)) {
                //     this.log("ARBIT BOT NO LONGER IN BOTS");
                //     return false;
                // }

                // this.abots = this.abots.map((abot2) => {
                //     return abot2.bot.id == abot.bot.id ? abot : abot2;
                // });
            
                if (miniBot.client) {
                miniBot.client.emit("/client-ws/book", {
                    type: "tri",
                    bookA,
                    bookB,
                    bookC,
                    pairA,
                    pairB,
                    pairC,
                    tickerA,
                    tickerB,
                    tickerC,
                    tickerPerc,
                    ftickerPerc,
                    perc: _perc,
                    fperc: _fperc,
                });
            } else {
                this.log("Hold...");
                await sleep(5000);
                this.log("Go on!");
            }
            miniBot.active = true;
            // this._updateBots(miniBot);
            return true;
        } catch (e) {
            this.log(e);
            return false;
        }
    }

    async rmvBot(){
        this.log("Removing bot...")
        await this.subUnsub("unsub")
        this.log("Bot removed successfully")
    }

    async _onMessageCross(r: ReturnType<typeof this.parseData>) {}
    log(...args: any) {
        botLog(this.bot, `[WS][${this.plat}] `, ...args);
    }
}
