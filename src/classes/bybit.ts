import { IBot } from "@/models/bot";
import { ensureDirExists } from "@/utils/orders/funcs";
import { getExactDate, parseDate, parseFilledOrder } from "@/utils/funcs2";
import {
    botLog,
    capitalizeFirstLetter,
} from "@/utils/functions";
import { RestClientV5 } from "bybit-api";
import type { OrderResultV5 } from "bybit-api";
import { writeFileSync } from "fs";
import { DEV, isStopOrder } from "@/utils/constants";
import { IOrderDetails } from "@/utils/interfaces";

export class Bybit {
    bot: IBot;
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    client: RestClientV5;
    constructor(bot: IBot) {
        console.log(
            `\nInit BYBIT For Bot=${bot.name}\tMode=${
                bot.demo ? "demo" : "live"
            }\n`
        );
        this.bot = bot;
        this.flag = this.bot.demo ? "1" : "0";
        this.apiKey = this.bot.demo
            ? process.env.BYBIT_API_KEY_DEV!
            : process.env.BYBIT_API_KEY!;
        this.apiSecret = this.bot.demo
            ? process.env.BYBIT_API_SECRET_DEV!
            : process.env.BYBIT_API_SECRET!;
        this.passphrase = process.env.BYBIT_PASSPHRASE!;

        this.client = new RestClientV5({
            key: this.apiKey,
            secret: this.apiSecret,
            demoTrading: this.bot.demo,
        });
    }

    async getBal(ccy?: string) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getWalletBalance({
                accountType: "UNIFIED",
                coin: ccy ?? this.bot.ccy,
            });
            if (res.retCode != 0) {
                console.log(res);
                return;
            }
            return Number(res.result.list[0].coin[0].availableToWithdraw);
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
          const  res = await this.client.submitOrder({
                symbol: this.getSymbol(),
                orderType:  is_market ? 'Market' : "Limit",
                side: capitalizeFirstLetter(side),
                qty: amt.toString(),
                price: price?.toString(),
                category: this.bot.category as any,
                timeInForce: "GTC",
                orderLinkId: clOrderId});
            if (res.retCode != 0) {
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);

            return res.result.orderId;
        } catch (error) {
            console.log(error);
        }
    }

    async getOrderbyId(orderId: string, isAlgo = false) {
        try {
            let data: IOrderDetails | null = null;

            botLog(this.bot, "GETTING ORDER...");
            const res = await this.client.getActiveOrders({
                symbol: this.getSymbol(),
                category: this.bot.category as any,
                orderId: orderId,
            });

            if (res.retCode != 0) {
                console.log(res);
                return;
            }
            const { list } = res.result;

            if (!list[0]) {
                console.log(res);
                botLog(this.bot, "ORDER NOT FOUND");
                return;
            }
            const d = list[0];

            if (DEV) console.log(d);
            if (list[0].orderStatus != "Filled") {
                botLog(this.bot, "[Bybit class] Order not yet filled");
                return "live";
            }

            data = parseFilledOrder(d, this.bot.platform);
            return data;
        } catch (error) {
            console.log(error);
        }
    }
    async getTicker(){
        botLog(this.bot, "GETTING TICKER...")
        const res = await this.client.getTickers({
            symbol: this.getSymbol(), category: 'spot'
        })
        const ticker = Number(res.result.list[0].lastPrice)
        console.log({ticker});
        return ticker
    }
    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
        limit = 1000
    }: {
        end?: number;
        start?: number;
        interval?: number;
        symbol?: string;
        savePath?: string;
        limit?: number
    }) {
        end = end ?? getExactDate(this.bot.interval).getTime() - this.bot.interval * 60 * 1000; 
        let klines: any[] = [];
        let cnt = 0;
        interval = interval ?? this.bot.interval;
        symbol = symbol ?? this.getSymbol();

        
            console.log("GETTING KLINES...");
            const res = await this.client.getKline({
                symbol,
                interval: interval as any,
                end: end,
                //start: start,
                limit: 200,
                category: this.bot.category as any,
            });
            let data = res.result.list;
            klines = [...data].reverse();
        const d = [...klines]; //.reverse()

        const last = Number(d[d.length - 1][0])

        botLog(this.bot, {end: parseDate(end), last: parseDate(last)})
        if (end >= last + interval * 60000){
            botLog(this.bot, "END > LAST")
            return await this.getKlines({ start,
                end,
                savePath,
                interval,
                symbol,
                limit })
        }
        return limit == 1 ? d[d.length - 1] : d;
    }

    async getKline(){
        const end = Date.now()
        return await this.getKlines({end, limit: 1})
    }

    getSymbol() {
        return `${this.bot.base}${this.bot.ccy}`;
    }
    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            const res = await this.client.cancelOrder({
                orderId: ordId,
                symbol: this.getSymbol(),
                category: this.bot.category as any,
            });
            if (res.retCode != 0) {
                botLog(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res);
                return;
            }
            return res.result.orderId;
        } catch (error) {}
    }
}
