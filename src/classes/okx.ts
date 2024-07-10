import { IBot } from "@/models/bot";
import { ensureDirExists } from "@/utils/orders/funcs";
import { getInterval, parseDate, parseFilledOrder } from "@/utils/funcs2";
import { botLog, getCoinPrecision, getPricePrecision } from "@/utils/functions";
import axios from "axios";
import { writeFileSync } from "fs";
import { RestClient, WebsocketClient } from "okx-api";
import type {
    AlgoOrderDetailsRequest,
    AlgoOrderDetailsResult,
    OrderDetails,
} from "okx-api";
import { DEV, isStopOrder } from "@/utils/constants";
import { Bot, Order } from "@/models";
import { afterOrderUpdate } from "@/utils/orders/funcs2";
import { Bybit } from "./bybit";
import { IOrder } from "@/models/order";
import { configDotenv } from "dotenv";
configDotenv();

export class OKX {
    bot: IBot;
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    client: RestClient;
    ws: WebsocketClient | null = null;

    constructor(bot: IBot) {
        console.log(
            `\nInit OKX For Bot=${bot.name}\tMode=${
                bot.demo ? "demo" : "live"
            }\n`
        );
        this.bot = bot;
        this.flag = this.bot.demo ? "1" : "0";
        this.apiKey = this.bot.demo
            ? process.env.OKX_API_KEY_DEV!
            : process.env.OKX_API_KEY!;
        this.apiSecret = this.bot.demo
            ? process.env.OKX_API_SECRET_DEV!
            : process.env.OKX_API_SECRET!;
        this.passphrase = process.env.OKX_PASSPHRASE!;

        this.client = new RestClient(
            {
                apiKey: this.apiKey,
                apiSecret: this.apiSecret,
                apiPass: this.passphrase,
            },
            this.bot.demo ? "demo" : "prod"
        );

        botLog(this.bot, "OKX INITIALIZED");
    }

    async getBal(ccy?: string) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getBalance(ccy ?? this.bot.ccy);
            return Number(res[0].details[0].availBal);
        } catch (error) {
            console.log(error);
        }
    }

    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            const res = await this.client.cancelOrder({
                ordId,
                instId: this.getSymbol(),
            });
            if (res[0].sCode != "0") {
                botLog(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res[0]);
                return;
            }
            return res[0].ordId;
        } catch (error) {}
    }
    async placeOrder(
        amt: number,
        price: number,
        side: "buy" | "sell" = "buy",
        sl: number,
        clOrderId: string
    ) {
        /* Place limit order at previous close */
        const od = { price, sl, amt, side };
        botLog(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            const res =
                side == "buy"
                    ? await this.client.submitOrder({
                          instId: this.getSymbol(),
                          tdMode: "cash",
                          ordType: "market",
                          side,
                          sz: amt.toString(),
                          clOrdId: clOrderId,
                          //px: price.toString(),
                      })
                    : await this.client.placeAlgoOrder({
                          instId: this.getSymbol(),
                          tdMode: "cash",
                          ordType: "oco",
                          tpTriggerPx: price.toString(),
                          slTriggerPx: sl.toString(),
                          side,
                          sz: amt.toString(),
                          tpOrdPx: "-1",
                          slOrdPx: "-1",
                          algoClOrdId: clOrderId,
                      });

            if (res[0].sCode != "0") {
                console.log(res[0]);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);
            const d: any = res[0];
            const id: string = side == "buy" ? d.ordId : d.algoId;
            return id;
        } catch (error) {
            console.log(error);
        }
    }

    async getOrderbyId(orderId: string, isAlgo = false) {
        try {
            let data: {
                id: string;
                fillTime: number;
                fillSz: number;
                fillPx: number;
                fee: number;
            } | null = null;
            let finalRes: OrderDetails | null = null;
            botLog(this.bot, `IS_ALGO: ${isAlgo}`);
            const res = isAlgo
                ? await this.client.getAlgoOrderDetails({ algoId: orderId })
                : await this.client.getOrderDetails({
                      ordId: orderId!,
                      instId: this.getSymbol(),
                  });
            if (DEV) {
                console.log(res);
            }
            if (isAlgo && res[0].state == "effective") {
                const res2 = (
                    await this.client.getOrderDetails({
                        instId: this.getSymbol(),
                        ordId: res[0].ordId,
                    })
                )[0];
                finalRes = res2;
            } else if (!isAlgo && res[0].state == "filled") {
                finalRes = res[0];
            }
            if (!finalRes) {
                botLog(this.bot, "[OKX Class] ORDER NOT YET FILLED");
                return "live";
            }
            console.log(finalRes);
            data = parseFilledOrder(finalRes);

            return data;
        } catch (error) {
            console.log(error);
        }
    }

    async setLev(val: number) {
        const res = await this.client.setLeverage({
            instId: this.getSymbol(),
            mgnMode: "isolated",
            lever: `${val}`,
        });
        console.log(res);
    }

    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
    }: {
        end?: number;
        start?: number;
        interval?: number;
        symbol?: string;
        savePath?: string;
    }) {
        end = end ?? Date.now();
        let klines: any[] = [];
        let cnt = 0;
        interval = interval ?? this.bot.interval;
        symbol = symbol ?? this.getSymbol();
        botLog(this.bot, "GETTING KLINES.. FOR " + symbol);

        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                console.log(`GETTING ${cnt + 1} KLINES...`);
                const limit = 100;
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(
                    `Before: ${parseDate(
                        new Date(firstTs)
                    )} \t After: ${parseDate(new Date(after))}`
                );
                const res = await this.client.getCandles(
                    symbol,
                    getInterval(interval, "okx"),
                    {
                        before: `${firstTs}`,
                        after: `${after}`,
                        limit: `${limit}`,
                    }
                );
                let data = res;
                if (!data.length) break;
                klines.push(...[...data].reverse());

                firstTs = Number(data[0][0]) + interval * 60 * 1000;
                console.log(new Date(firstTs).toISOString());
                if (savePath) {
                    ensureDirExists(savePath);
                    writeFileSync(savePath, JSON.stringify(klines));
                    console.log("Saved");
                }
                cnt += 1;
            }
        } else {
            const res = await this.client.getCandles(
                 symbol,
                getInterval(interval, "okx"),
                {
                    before: start ? `${start}` : undefined,
                    after: end ? `${end}` : undefined,
                }
            );
            let data = res;
            klines = [...data].reverse();
        }

        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }

    getSymbol() {
        return `${this.bot.base}-${this.bot.ccy}`;
    }
}

let isSubed = false;

export class MainOKX {
    passphrase: string;
    ws: WebsocketClient;
    wsDemo: WebsocketClient;
    wsList: WebsocketClient[];

    constructor() {
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
        this.initWs();
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
                    console.log("WS AUTH SUCCESS");

                    /* SUBSCRIBE TO ORDERS CHANNEL */
                    console.log(`SUBED: ${isSubed}`);
                    if (true) {
                        console.log("SUBSCRIBING...");
                        ws.subscribe({ channel: "orders", instType: "ANY" });
                        ws.subscribe({
                            channel: "orders-algo",
                            instType: "ANY",
                        });
                        isSubed = true;
                    }
                }
            });

            ws.on("update", async (e) => {
                const { data, arg } = e;
                console.log("WS UPDATE");
                console.log(arg);

                if (arg.channel == "orders") {
                    /* HANDLE ORDERS */

                    for (let ord of data as OrderDetails[]) {
                        const ordLog = (arg: any) => {
                            console.log(`\n[ORDER: ${ord.ordId} ]\t${arg}\n`);
                        };

                        const isBuyOrder = ord.side == "buy";
                        const filt = { cl_order_id: ord.clOrdId };
                        console.log(filt);
                        const order = await Order.findOne(filt).exec();

                        if (order) {
                            const bot = await Bot.findOne({
                                orders: order._id,
                            }).exec();
                            if (!bot) {
                                ordLog("BOT CONTAINING ORDER NOT FOUND");
                                return;
                            }
                            if (ord.state == "filled") {
                                const orderDetails = parseFilledOrder(ord);
                                updateOrder({
                                    orderDetails,
                                    order,
                                    isBuyOrder,
                                    bot,
                                });
                            } else if (ord.state == "canceled") {
                                if (isBuyOrder) {
                                    /* DELETE BUY ORDER FROM DB */
                                    await Order.findByIdAndDelete(
                                        order._id
                                    ).exec();
                                    ordLog("DELETED FROM DB");
                                    bot.orders = bot.orders.filter(
                                        (el) =>
                                            el.toString() !=
                                            order._id.toString()
                                    );
                                    botLog(bot, `Orders: ${bot.orders.length}`);
                                    await Order.findByIdAndDelete(order._id);
                                    await bot.save();
                                    botLog(bot, "ORDER DELETED");
                                } else {
                                    /* CLEAR SELL ORDER ID */

                                    botLog(bot, "CLEARING SELL ORDER_ID...");
                                    order.order_id = "";
                                    order.sell_timestamp = undefined;
                                    order.sell_price = 0;
                                    await order.save();
                                    botLog(bot, "ORDER_ID CLEARED");
                                }
                            }
                        } else {
                            ordLog("NOT IN DB");
                        }
                    }
                }

                if (arg.channel == "orders-algo") {
                    /* HANDLE ALGO ORDERS */
                    for (let ord of data as AlgoOrderDetailsResult[]) {
                        const ordLog = (arg: any) => {
                            console.log(
                                `\nALGO: [ORDER: ${ord.algoId} ]\t${arg}\n`
                            );
                        };

                        const isBuyOrder = ord.side == "buy";
                        const filt = { cl_order_id: ord.algoClOrdId };
                        console.log(filt);
                        const order = await Order.findOne(filt).exec();

                        if (order) {
                            const bot = await Bot.findOne({
                                orders: order._id,
                            }).exec();
                            if (!bot) {
                                ordLog("BOT CONTAINING ORDER NOT FOUND");
                                return;
                            }
                            /* GET REAL ORDER DETAILS */
                            if (ord.state == "effective") {
                                ordLog("STATE == effective");
                                const plat =
                                    bot.platform == "okx"
                                        ? new OKX(bot)
                                        : new Bybit(bot);
                                const res = await plat.getOrderbyId(
                                    ord.ordId,
                                    false
                                );
                                if (!res)
                                    botLog(
                                        bot,
                                        `FAILED TO CHECK [ALGO] ORDER: ${ord.ordId}`
                                    );
                                else if (res != "live") {
                                    await updateOrder({
                                        orderDetails: res,
                                        order,
                                        isBuyOrder,
                                        bot,
                                    });
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}

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
        console.log(`\n[${bot.name}] <> : Updating buy order\n`);
        const ts = {
            ...order.buy_timestamp,
            o: parseDate(new Date(orderDetails.fillTime)),
        };
        console.log("TS", JSON.stringify(ts));
        const fee = orderDetails.fee;
        let base_amt = orderDetails.fillSz;
        order.buy_order_id = orderDetails.id;
        order.buy_price = orderDetails.fillPx;
        order.buy_fee = Math.abs(fee);
        order.base_amt = base_amt;
        order.ccy_amt = orderDetails.fillSz * orderDetails.fillPx;
        order.side = "sell";
        order.buy_timestamp = ts;
        await order.save();

        /* CALL TO PLACE SELL ORDER IF IS_STOP_ORDER */
        await afterOrderUpdate({ bot });
    } else {
        console.log(`\n[${bot.name}] <> : Updating sell order\n`);
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
