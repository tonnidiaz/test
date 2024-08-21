import { IBot } from "@/models/bot";
import { ensureDirExists } from "@/utils/orders/funcs";
import { getInterval, parseDate, parseFilledOrder } from "@/utils/funcs2";
import { botLog, capitalizeFirstLetter, getSymbol } from "@/utils/functions";
import { RestClientV5 } from "bybit-api";
import type { OrderResultV5 } from "bybit-api";
import { writeFileSync } from "fs";
import { DEV, isStopOrder } from "@/utils/constants";
import { IOrderDetails } from "@/utils/interfaces";
import { Spot } from "mexc-api-sdk";

export class Mexc {
    bot: IBot;
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    client: Spot;
    constructor(bot: IBot) {
        this.bot = bot;
        this.apiKey = process.env.MEXC_API_KEY!;
        this.apiSecret = process.env.MEXC_API_SECRET!;
        this.passphrase = process.env.MEXC_PASSPHRASE!;

        this.client = new Spot(this.apiKey, this.apiSecret);
    }

    async getBal(ccy?: string) {
        botLog(this.bot, "GETTING BAL...");
        try {
            const res = await this.client.accountInfo();
            if (!res.canTrade) {
                console.log(res);
                return;
            }
            return Number(
                res.balances.find((el) => el.asset == ccy ?? this.bot.ccy)
                    ?.free ?? 0
            );
        } catch (error) {
            console.log(error);
        }
    }
    async placeOrder(
        amt: number,
        price?: number,
        side: "buy" | "sell" = "buy",
        sl?: number,
        clOrderId?: string
    ) {
        const od = { price, sl, amt, side };
        botLog(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            const { order_type } = this.bot;

            const is_market = price == undefined
            const res = await this.client.newOrder(
                this.getSymbol(),
                side.toUpperCase(),
                ( is_market ? "Market" : "Limit").toUpperCase(),
                {
                    quantity: !is_market ?  amt.toString() : undefined,
                    quoteOrderQty: is_market ?  amt.toString() : undefined,
                    price: price?.toString(),
                    newClientOrderId: clOrderId,
                }
            );
            if (!res.orderId) {
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);

            return res.orderId;
        } catch (error: any) {
            //[ 'statusCode', 'headers', 'body', 'url' ]
            this._parseErr(error)
        }
    }

    _parseErr(error: any){
        error = error?.body ? JSON.parse(error.body) : error
            console.log(error.msg);
    }
    async getOrderbyId(orderId: string, isAlgo = false) {
        try {
            let data: IOrderDetails | null = null;

            botLog(this.bot, "GETTING ORDER...");
            const res = await this.client.queryOrder(this.getSymbol(), {
                orderId,
            });

            if (!res.symbol) {
                console.log(res);
                return;
            }

            const d = res;

            if (DEV) console.log(d);
            if (res.status.toLowerCase() != "filled") {
                botLog(this.bot, "Order not yet filled");
                return "live";
            }

            data = parseFilledOrder(d, this.bot.platform);
            return data;
        } catch (error) {
            this._parseErr(error)
        }
    }
    async getTicker() {
        botLog(this.bot, "GETTING TICKER...");
        // const res = await this.client.getTickers({
        //     symbol: this.getSymbol(), category: 'spot'
        // })
        // const ticker = Number(res.result.list[0].lastPrice)
        // console.log({ticker});
        return 5;
    }
    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
        limit = 1000,
    }: {
        end?: number;
        start?: number;
        interval?: number;
        symbol?: string;
        savePath?: string;
        limit?: number;
    }) {
        end = end ?? Date.now() - this.bot.interval * 60 * 1000;
        let klines: any[] = [];
        let cnt = 0;
        interval = interval ?? this.bot.interval;
        symbol = symbol ?? this.getSymbol();

        const res = await this.client.klines(
            this.getSymbol(),
            getInterval(interval, "mexc"),
            { endTime: end, startTime: start }
        );

        const data = res;
        klines = [...data];

        const d = [...klines]; //.reverse()
        return limit == 1 ? d[d.length - 1] : d;
    }

    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }

    getSymbol() {
        return getSymbol([this.bot.base, this.bot.ccy], "mexc");
    }
    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            const res = await this.client.cancelOrder(this.getSymbol(), {
                orderId: ordId,
            });
            if (!res.symbol) {
                botLog(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res);
                return;
            }
            return res.orderId;
        } catch (error) {
            this._parseErr(error)
        }
    }
}
