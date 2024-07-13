import { IBot } from "@/models/bot";
import { WebsocketClient } from "okx-api";
import { configDotenv } from "dotenv";
import { Bot, Order } from "@/models";
import { calcSL, calcTP, parseDate } from "@/utils/funcs2";
import { ObjectId } from "mongoose";
import { botLog } from "@/utils/functions";
configDotenv();

let isSubed = false;
export class WsOKX {
    passphrase: string;
    ws: WebsocketClient;
    wsDemo: WebsocketClient;
    wsList: WebsocketClient[];
    inst: WsOKX
    ok: boolean
    botsWithPos: {id: ObjectId, sl: number, tp: number, entry: number}[] = []

    constructor() {
        this.ok = false
        this.inst = this
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

        this.wsList = [this.ws, this.wsDemo];
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
                    this.ok = true
                    console.log("WS AUTH SUCCESS")
                }
            });

            ws.on("update", async (e) => {
                const { data, arg } = e;
                console.log("WS UPDATE");
                console.log(arg);

                if (arg.channel == "tickers") {
                    /* HANDLE TICKERS */

                    const ticker = data[0]
                    const px = Number(ticker.last)
                    const ts = parseDate(new Date(Number(ticker.ts)))
                    console.log({px, ts});
                }

            });
        }
    }
    async sub(bot: IBot){
        const symbol = this.getSymbol(bot)
        for (let ws of this.wsList){
            ws.subscribe({channel: 'tickers', instId: symbol})
        }
    }
    async unsub(bot: IBot){
        const symbol = this.getSymbol(bot)
        for (let ws of this.wsList){
            ws.unsubscribe({channel: 'tickers', instId: symbol})
        }
    }
    getSymbol(bot: IBot) {
        return `${bot.base}-${bot.ccy}`;
    }

    async addBot(botId: ObjectId){
        const bot = await Bot.findById(botId).exec()
        if (!bot) return console.log("BOT NOT FOUND");
        const oid = bot.orders[bot.orders.length - 1]
        const order = await Order.findById(oid).exec()
        if (!order)
            return botLog(bot, `ORDER: ${oid} not found`)

        const entry = order.buy_price
        this.botsWithPos.push({id: botId, sl: calcSL(entry), tp: calcTP(entry), entry})
        console.log(`WS: BOT: ${botId} added`);
    }
    async rmvBot(botId: ObjectId){
        this.botsWithPos = this.botsWithPos.filter(el => el.id != botId)
        console.log(`WS: BOT: ${botId} removed`);
    }
}
