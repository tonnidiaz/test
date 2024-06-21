import { IBot } from "@/models/bot";
import { ensureDirExists } from "@/utils/orders/funcs";
import { parseDate } from "@/utils/funcs2";
import {
    botLog,
    capitalizeFirstLetter,
    getCoinPrecision,
    getPricePrecision,
} from "@/utils/functions";
import { RestClientV5 } from "bybit-api";
import { writeFileSync } from "fs";
import { DEV } from "@/utils/constants";

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
        price: number,
        side: "buy" | "sell" = "buy",
        sl: number
    ) {
        
        const od = { price, sl, amt, side };
        botLog(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            const res = await this.client.submitOrder({
                symbol: this.getSymbol(),
                orderType: this.bot.order_type,
                side: capitalizeFirstLetter(side),
                qty: amt.toString(),
                price: price.toString(),
                category: this.bot.category as any,
                timeInForce: 'GTC',
                triggerPrice: sl.toString(), orderFilter: 'StopOrder'
                
            });
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

    async getOrderbyId(orderId?: string) {
        try {
            let data: {
                id: string;
                fillTime: number;
                fillSz: number;
                fillPx: number;
                fee: number;
            } | null = null
            botLog(this.bot, 'GETTING ORDER...')
            const res = await this.client.getActiveOrders({
                symbol: this.getSymbol(),
                category: this.bot.category as any,
                orderId: orderId,
            });

            if (res.retCode != 0) {
                console.log(res);
                return;
            }
            const {list } = res.result
            
            if (!list[0]){
                console.log(res);
                botLog(this.bot, 'ORDER NOT FOUND')
                return
            }
             const d = list[0]
          
            if (DEV) console.log(d);
            if (list[0].orderStatus != 'Filled') {
                botLog(this.bot, '[Bybit class] Order not yet filled')
                return 'live'
            }
           
            data = {
                id: d.orderId,
                fillTime: Number(d.updatedTime),
                fillSz: Number(d.cumExecQty),
                fillPx: Number(d.avgPrice),
                fee: Number(d.cumExecFee),
            }
            return  data
        } catch (error) {
            console.log(error);
        }
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

        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                console.log(`GETTING ${cnt + 1} KLINES...`);
                console.log(parseDate(new Date(firstTs)));
                const res = await this.client.getKline({
                    symbol: symbol,
                    interval: interval as any,
                    start: firstTs,
                    limit: 1000,
                    category: this.bot.category as any,
                });
                const data = res.result.list;
                if (!data.length) break;
                klines.push(...[...data].reverse());
                console.log(new Date(Number(data[0][0])).toISOString());
                firstTs = Number(data[0][0]) + this.bot.interval * 60 * 1000;
                console.log(new Date(firstTs).toISOString());
                if (savePath) {
                    ensureDirExists(savePath);
                    writeFileSync(savePath, JSON.stringify(klines));
                    console.log("Sved");
                }
                cnt += 1;
            }
        } else {
            console.log("GETTING KLINES...");
            const res = await this.client.getKline({
                symbol: this.getSymbol(),
                interval: this.bot.interval as any,
                end: end,
                start: start,
                limit: 1000,
                category: this.bot.category as any,
            });
            let data = res.result.list;
            klines = [...data].reverse();
        }

        const d = [...klines]; //.reverse()
        return d;
    }

    getSymbol() {
        return `${this.bot.base}${this.bot.ccy}`;
    }
    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            const res = await this.client.cancelOrder({
                orderId: ordId,
                symbol: this.getSymbol(),
                category: this.bot.category as any
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
