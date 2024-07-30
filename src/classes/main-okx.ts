import { IBot } from "@/models/bot";
import { AlgoOrderDetailsResult, OrderDetails, WebsocketClient } from "okx-api";
import { configDotenv } from "dotenv";
import { Bot, Order } from "@/models";
import {
    calcSL,
    calcTP,
    findBotOrders,
    getInterval,
    heikinAshi,
    parseDate,
    parseFilledOrder,
    parseKlines,
    tuCE,
} from "@/utils/funcs2";
import { ObjectId } from "mongoose";
import { botLog, getPricePrecision, timedLog } from "@/utils/functions";
import { OKX } from "./okx";
import { placeTrade } from "@/utils/orders/funcs";
import { DEV, getTrailingStop, stops, demo, platforms, TP, TRAILING_STOP_PERC } from "@/utils/constants";
import { IObj } from "@/utils/interfaces";
import { IOrder } from "@/models/order";
import { scheduleJob } from "node-schedule";
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
                    timedLog("WS AUTH SUCCESS");
                    timedLog("SUBSCRIBING...");
                    //ws.subscribe({ channel: "orders", instType: "ANY" });
                    //ws.subscribe({
                    //    channel: "orders-algo",
                    //    instType: "ANY",
                    //});
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
                            if (DEV) {
                                timedLog("WS UPDATE");
                                //timedLog(candle);
                            }
                            updateOpenBot(bot, openBot, df);
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

    async pauseBot(botId: ObjectId) {
        timedLog(`\WS: PAUSING BOT: ${botId}...`);
        const bot = await Bot.findById(botId).exec();
        if (bot) {
            await this._unsubBot(bot);
            timedLog("WS: PAUSED...");
        }
    }
    async resumeBot(botId: ObjectId) {
        timedLog(`\WS: RESUMING BOT: ${botId}...`);
        const bot = await Bot.findById(botId).exec();
        if (bot) {
            await this.sub(bot);
            timedLog("WS: BOT RESUMED...");
        }
    }
    async addBot(botId: ObjectId, first = false) {
        timedLog(`\WS: ADDING BOT: ${botId}...`);

        try{
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
    
            // SCHEDULE A ONCE OFF JOB TO BE EXEC AT 10 SECS B4 THE NEXT CANDLE
            if (first) {
                const prev = klines[klines.length - 1];
                const ts = Number(prev[0]);
                const closeTime = ts + 2 * bot.interval * 60000;
                const at = new Date(closeTime - 30 * 1000);
                timedLog("SCHEDULING TIMED:", parseDate(at));
                scheduleJob(at, () => updateBotAtClose(bot));
            }
            timedLog(`WS: BOT: ${botId} added`);
        }
        catch(e){
            console.log(e);
        }
    }
    async rmvBot(botId: ObjectId) {
        this.botsWithPos = this.botsWithPos.filter((el) => el.id != botId);
        const bot = await Bot.findById(botId).exec();
        if (bot) await this._unsubBot(bot);
        timedLog(`WS: BOT: ${botId} removed`);
    }

    async _unsubBot(bot: IBot) {
        if (
            !(await Bot.find({ base: bot?.base, ccy: bot?.ccy }).exec()).length
        ) {
            await this.unsub(bot!);
        }
    }
}

const updateBotAtClose = async (_bot: IBot) => {
    timedLog("TIMED: UPDATE AT CLOSE");
    const bot = await Bot.findById(_bot.id).exec();

    if (!bot) return;
    const order = await Order.findById(bot.orders[bot.orders.length - 1]).exec();

    const pos = order && order.side == "sell" && !order.is_closed;
    timedLog("TIMED: ", { sell_px: order?.sell_price, pos });
    if (!pos) return;

    const { sell_price } = order;
    const plat = new OKX(bot);
    const c = await plat.getTicker();
    timedLog({ticker: c})
    const _sl = order.buy_price * (1- stops[bot.interval]/100)
    const _tp = order.tp

    if (sell_price < c && c >= _sl) {
        if (c >= order.buy_price && c < _tp){
            return botLog(bot, "TIMED: PRICE BELOW MIN TP")
        }
        botLog(
            bot,
            `TIMED: PLACING MARKET SELL ORDER AT CLOSE SINCE IT IS > STOP_PX`,
            { ts: parseDate(new Date()), c, sell_price, _sl }
        );
        const amt = order.base_amt - order.buy_fee;
        const r = await placeTrade({
            bot: bot,
            ts: parseDate(new Date()),
            amt: Number(amt),
            side: "sell",
            plat: plat,
            price: 0,
        });
        if (!r) return botLog(bot, "TIMED: FAILED TO PLACE MARKET SELL ORDER");
        //await wsOkx.rmvBot(bot.id)
        await wsOkx.rmvBot(bot.id);
        botLog(bot, "TIMED: MARKET SELL PLACED. BOT REMOVED");
    }
};
const updateOpenBot = async (bot: IBot, openBot: IOpenBot, klines: IObj[]) => {
    let placed = false,
        rmvd = false;
    try {
        await wsOkx.pauseBot(openBot.id);

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

            const trailingStop = TRAILING_STOP_PERC// getTrailingStop(bot.interval)
           

            let { exitLimit } = openBot;
            const row = klines[klines.length - 1];
            const prevRow = klines[klines.length - 2];

            const { o, l, h, c, ha_h, ts } = row;
            const _isGreen = prevRow.c >= o;
            let { stop_price, sell_price } = order;
            const entry = order.buy_price
             const _sl = entry * (1- stops[bot.interval]/100)
             const _tp = o * (1 + TP/100)
            const initHighs = order.highs.map((el) => el.val!);

            order.tp = _tp
            if (DEV){
                timedLog("WS", {row})
            }
            if (c != initHighs[initHighs.length - 1]) {
                order.highs.push({ ts: parseDate(new Date()), val: c });
                timedLog("ADDING HIGHS...")
            }
            if (c != initHighs[initHighs.length - 1]) {
                order.all_highs.push({ ts: parseDate(new Date()), val: c });
                timedLog("ADDING ALL_HIGHS...")
            }
await order.save()

            // STOP LISTENING IF L <= O TRAILING STOP
            const lFromO = ((o - l) / l) * 100;

            
            /* if (!_isGreen && lFromO >= trailingStop) {
                timedLog("LOW REACHED O TRAILER...SKIPPING", {
                    o,
                    l,
                    lFromO,
                    c,
                });
                await wsOkx.rmvBot(bot.id);
                rmvd = true;
                return;
            }
 */
            // ADJUST STOP_PRICE IF HIGH IS HIGHER THAN ORDER HIGHS

            if (initHighs.every((el) => el < h)) {
                timedLog("ADJUSTING THE STOP_PRICE");
                stop_price = h * (1 - trailingStop / 100);
                order.stop_price = stop_price;

                // ADJUST _EXIT
                sell_price = h * (1 - trailingStop / 100);
                order.sell_price = sell_price;
                await order.save();
            }

            if (c <= sell_price && c >= _sl) {

                if (c >= entry && c < _tp){
                    return botLog(bot, "WS: PRICE BELOW MIN TP", {_tp, c})
                }
                botLog(bot, `PLACING MARKET SELL ORDER AT EXIT`, {
                    h,
                    sell_price,
                    c,
                    _sl
                });
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
        if (!placed && !rmvd) {
            await wsOkx.resumeBot(bot.id);
        } else if (placed) {
            await wsOkx.rmvBot(bot.id);
        }
    }
};

const updateOrder = async ({
    order,
    isBuyOrder,
    orderDetails,
    bot,
}: {
    bot: IBot;
    orderDetails: ReturnType<typeof parseFilledOrder>;
    isBuyOrder: boolean;
    order: IOrder;
}) => {
    if (isBuyOrder) {
        /* UPDATE BUY ORDER */
        botLog(bot, `WS: Updating buy order`);
    } else {
        botLog(bot, `WS: Updating sell order`);
        /* UPDATE SELL ORDER */
        /* THEN WHEN THE TIME COMES, A BUY ORDER WILL BE PLACED BASED ON SIGNALS */
        const fee = Math.abs(orderDetails.fee); // In USDT

        /* Buy/Base fee already removed when placing sell order  */
        order.new_ccy_amt = orderDetails.fillSz * orderDetails.fillPx;
        order.sell_price = orderDetails.fillPx;
        order.is_closed = true;
        order.sell_fee = fee;
        order.sell_timestamp = {
            ...order.sell_timestamp,
            o: parseDate(new Date(orderDetails.fillTime)),
        };
        /* order == currentOrder */
        const bal = order.new_ccy_amt - Math.abs(orderDetails.fee);
        const profit = ((bal - order.ccy_amt) / order.ccy_amt) * 100;
        order.profit = profit;
        order.order_id = orderDetails.id;
        await order.save();
    }
};

console.log("WS OKX");
export const wsOkx: WsOKX = new WsOKX();
try{
   wsOkx.initWs()
}
catch(e){
    timedLog("FAILED TO INIT WS")
    console.log(e);
}
