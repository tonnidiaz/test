import { IBot } from "@/models/bot";
import { WebsocketClient } from "okx-api";
import { configDotenv } from "dotenv";
import { Bot, Order } from "@/models";
import {
    calcSL,
    calcTP,
    findBotOrders,
    heikinAshi,
    parseDate,
    parseKlines,
} from "@/utils/funcs2";
import { ObjectId } from "mongoose";
import { botLog, getPricePrecision } from "@/utils/functions";
import { OKX } from "./okx";
import { placeTrade } from "@/utils/orders/funcs";
import { DEV, demo } from "@/utils/constants";
configDotenv();

interface IOpenBot {
    id: ObjectId;
    exitLimit: number;
    entry: number;
    ha_h: number;
}

let isSubed = false;
export class WsOKX {
    passphrase: string;
    ws: WebsocketClient;
    wsDemo: WebsocketClient;
    wsList: WebsocketClient[];
    inst: WsOKX;
    ok: boolean;
    botsWithPos: IOpenBot[] = [];

    constructor() {
        this.ok = false;
        this.inst = this;
        const { env } = process;
        this.passphrase = env.OKX_PASSPHRASE!;
        console.log(env.OKX_API_KEY, env.OKX_API_SECRET, this.passphrase);

        console.log("DEV");
        console.log(
            env.OKX_API_KEY_DEV,
            env.OKX_API_SECRET_DEV,
            this.passphrase
        );
        this.ws = new WebsocketClient({
            accounts: [
                {
                    apiKey: env.OKX_API_KEY!,
                    apiPass: this.passphrase,
                    apiSecret: env.OKX_API_SECRET!,
                },
            ],
            market: "prod",
        });
        this.wsDemo = new WebsocketClient({
            accounts: [
                {
                    apiKey: env.OKX_API_KEY_DEV!,
                    apiPass: this.passphrase,
                    apiSecret: env.OKX_API_SECRET_DEV!,
                },
            ],
            market: "demo",
        });

        this.wsList = [demo ? this.wsDemo : this.ws];
        console.log("MAIN_OKX INIT");
    }

    async initWs() {
        for (let ws of this.wsList) {
            ws.connectPrivate();
            ws.on("open", (e) => {
                console.log("WEB SOCKET CONNECTED");
            });
            ws.on("error", (e) => {
                console.log("WEB SOCKET ERROR");
            });
            ws.on("close", (e) => {
                console.log("WEB SOCKET CLOSED");
            });

            ws.on("response", (resp) => {
                const { event } = resp;
                if (event == "login") {
                    if (resp.code != "0") {
                        console.log("FAILED TO LOGIN...");
                        return;
                    }
                    this.ok = true;
                    console.log("WS AUTH SUCCESS");
                }
            });

            ws.on("update", async (e) => {
                const { data, arg } = e;
                if (DEV) {
                    console.log("WS UPDATE");
                    console.log(arg);
                }

                if (arg.channel == "tickers") {
                    /* HANDLE TICKERS */

                    const ticker = data[0];
                    const px = Number(ticker.last);
                    const ts = parseDate(new Date(Number(ticker.ts)));
                    for (let bot of this.botsWithPos) {
                        console.log({ ...bot, h: px });
                        updateOpenBot(bot, px);
                    }
                }
            });
        }
    }
    async sub(bot: IBot) {
        const symbol = this.getSymbol(bot);
        for (let ws of this.wsList) {
            ws.subscribe({ channel: "tickers", instId: symbol });
        }
    }
    async unsub(bot: IBot) {
        const symbol = this.getSymbol(bot);
        for (let ws of this.wsList) {
            ws.unsubscribe({ channel: "tickers", instId: symbol });
        }
    }
    getSymbol(bot: IBot) {
        return `${bot.base}-${bot.ccy}`;
    }

    async addBot(botId: ObjectId) {
        const bot = await Bot.findById(botId).exec();
        if (!bot) return console.log("BOT NOT FOUND");
        const oid = bot.orders[bot.orders.length - 1];
        const order = await Order.findById(oid).exec();
        if (!order) return botLog(bot, `ORDER: ${oid} not found`);
        const plat = new OKX(bot);
        const klines = await plat.getKlines({});
        const df = heikinAshi(parseKlines(klines));
        const prevRow = df[df.length - 1];
        console.log("WS OKX");
        botLog(bot, { prevRow });

        const entry = order.buy_price;
        this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
        this.botsWithPos.push({
            id: botId,
            exitLimit: order.sell_price,
            entry,
            ha_h: prevRow.ha_h,
        });
        console.log(`WS: BOT: ${botId} added`);
    }
    async rmvBot(botId: ObjectId) {
        this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
        console.log(`WS: BOT: ${botId} removed`);
    }
}

const updateOpenBot = async (openBot: IOpenBot, px: number) => {
    try {
        wsOkx.rmvBot(openBot.id);
        const bot = await Bot.findById(openBot.id).exec();

        if (!bot) return;
        const plat = new OKX(bot);
        const orders = await findBotOrders(bot);
        const pricePrecision = getPricePrecision([bot.base, bot.ccy], bot.platform);
        const order = orders[orders.length - 1];
        if (bot && order.side == 'sell' && !order.is_closed && order.sell_price != 0) {
            let { exitLimit, ha_h } = openBot;
            const h = px;
            /* CHECK CONDITIONS */
            let place = false;
            // px == row.h
            const isHaHit = openBot.exitLimit <= ha_h;
            const eFromH = Number((((exitLimit - h) / h) * 100).toFixed(2));
            botLog(bot, { isHaHit });
            if (isHaHit && eFromH < 0.5) {
                exitLimit *= 1 - eFromH / 100;
                exitLimit = Number(exitLimit.toFixed(pricePrecision));
                order.sell_price = exitLimit;
                await order.save();
                botLog(bot, `EXIT_LIMIT TO ${exitLimit} due to ha_h`);
            }
            if (exitLimit <= h) {
                botLog(bot, `PLACING MARKET SELL ORDER AT ${exitLimit}`);
                const amt = order.base_amt - order.buy_fee;
                const r = await placeTrade({
                    bot: bot,
                    ts: parseDate(new Date()),
                    amt: Number(amt),
                    side: "sell",
                    plat: plat,
                    price: 0,
                });
                if (!r) botLog(bot, "FAILED TO PLACE MARKET SELL ORDER");
            }
        }
    } catch (e) {
        console.log(e);
    }
};

export let wsOkx: WsOKX = new WsOKX();
wsOkx.initWs();
