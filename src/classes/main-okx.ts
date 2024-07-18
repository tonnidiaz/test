import { IBot } from "@/models/bot";
import { WebsocketClient } from "okx-api";
import { configDotenv } from "dotenv";
import { Bot, Order } from "@/models";
import {
    calcSL,
    calcTP,
    findBotOrders,
    getInterval,
    heikinAshi,
    parseDate,
    parseKlines,
    tuCE,
} from "@/utils/funcs2";
import { ObjectId } from "mongoose";
import { botLog, getPricePrecision, timedLog } from "@/utils/functions";
import { OKX } from "./okx";
import { placeTrade } from "@/utils/orders/funcs";
import { DEV, demo } from "@/utils/constants";
import { IObj } from "@/utils/interfaces";
configDotenv();

interface IOpenBot {
    id: ObjectId;
    exitLimit: number;
    klines: any[][];
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
                timedLog("WEB SOCKET CONNECTED");
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

                for (let botId of this.botsWithPos) {
                    const bot = await Bot.findById(botId.id).exec();
                    if (!bot?.active) return;

                    if (arg.channel == this.getCandleChannelName(bot!)) {
                        /* HANDLE TICKERS */

                        for (let openBot of this.botsWithPos) {
                            const df = tuCE(
                                heikinAshi(
                                    parseKlines([...openBot.klines, ...e.data])
                                )
                            );
                            const candle = df[df.length - 1];
                            if (DEV) {
                                timedLog("WS UPDATE");
                                timedLog(candle);
                            }
                            updateOpenBot(
                                bot,
                                { ...openBot, klines: df as any },
                                candle
                            );
                        }
                    }
                }
            });
        }
    }

    getCandleChannelName(bot: IBot) {
        const interval = getInterval(bot.interval, "okx");
        const channel = `candle${interval}` as any;
        return channel;
    }
    async sub(bot: IBot) {
        const symbol = this.getSymbol(bot);

        for (let ws of this.wsList) {
            ws.subscribe({
                channel: this.getCandleChannelName(bot),
                instId: symbol,
            });
        }
    }
    async unsub(bot: IBot) {
        const symbol = this.getSymbol(bot);
        for (let ws of this.wsList) {
            ws.unsubscribe({
                channel: this.getCandleChannelName(bot),
                instId: symbol,
            });
        }
    }
    getSymbol(bot: IBot) {
        return `${bot.base}-${bot.ccy}`;
    }

    async addBot(botId: ObjectId) {
        timedLog(`\WS: ADDING BOT: ${botId}...`);
        const bot = await Bot.findById(botId).exec();

        if (!bot) return console.log("BOT NOT FOUND");
        const order = await Order.findById(
            bot.orders[bot.orders.length - 1]
        ).exec();
        const plat = new OKX(bot);
        const klines = await plat.getKlines({});
        this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
        this.botsWithPos.push({
            id: botId,
            exitLimit: order!.sell_price,
            klines,
        });

        await this.sub(bot);
        timedLog(`WS: BOT: ${botId} added`);
    }
    async rmvBot(botId: ObjectId) {
        this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
        const bot = await Bot.findById(botId).exec();
        if (
            !(await Bot.find({ base: bot?.base, ccy: bot?.ccy }).exec()).length
        ) {
            await this.unsub(bot!);
        }
        timedLog(`WS: BOT: ${botId} removed`);
    }
}

const updateOpenBot = async (bot: IBot, openBot: IOpenBot, row: IObj) => {
    let placed = false;
    try {
        await wsOkx.rmvBot(openBot.id);

        const plat = new OKX(bot);
        const pricePrecision = getPricePrecision(
            [bot.base, bot.ccy],
            bot.platform
        );
        const order = await Order.findById(
            bot.orders[bot.orders.length - 1]
        ).exec();
        if (!order) return;

        if (
            bot &&
            order.side == "sell" &&
            !order.is_closed &&
            order.sell_price != 0
        ) {
            let { exitLimit } = openBot;
            /* CHECK CONDITIONS */
            const isHaHit =
                exitLimit <=
                row.ha_c; /* ASSUMING THAT THE CURRENT HA_C IS THE CURR HA_H */
            const isStdHit = exitLimit <= row.h;
            const stdAtHaExit = row.h;
            const eFromH = Number(
                (((exitLimit - row.c) / row.c) * 100).toFixed(2)
            );
            const _exit =
                isHaHit && isStdHit
                    ? stdAtHaExit
                    : isHaHit && !isStdHit
                    ? exitLimit * (1 - eFromH / 100)
                    : null;

            botLog(bot, { exitLimit, ha_h: row.ha_h, isHaHit, stdAtHaExit, isStdHit, eFromH, _exit });
            const { klines } = openBot;
            timedLog("WS: CANDLE: ", row);
            /* if (isHaHit) {
                exitLimit *= 1 - eFromH / 100;
                exitLimit = Number(exitLimit.toFixed(pricePrecision));
                order.sell_price = exitLimit;
                await order.save();
                botLog(bot, `EXIT_LIMIT TO ${exitLimit} due to ha_h`);
            } */

            if (_exit) {
                exitLimit = Number(_exit.toFixed(pricePrecision));
                order.sell_price = exitLimit;
                await order.save();
                botLog(bot, `EXIT_LIMIT TO ${exitLimit} due to ha_h`);
            }
            if (exitLimit <= row.c) {
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
                if (!r) return botLog(bot, "FAILED TO PLACE MARKET SELL ORDER");
                //await wsOkx.rmvBot(bot.id)
                placed = true;
                botLog(bot, "WS: MARKET SELL PLACED. BOT REMOVED");
            }
        }
    } catch (e) {
        console.log(e);
    } finally {
        if (!placed) {
            await wsOkx.addBot(bot.id);
        }
    }
};

let wsOkx: WsOKX = new WsOKX();
//wsOkx.initWs();
