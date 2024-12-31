import { IBot } from "@cmn/models/bot";
import { getExactDate, getInterval, parseFilledOrder } from "@cmn/utils/funcs2";
import {  getSymbol, handleErrs, sleep } from "@cmn/utils/functions";
import { SpotClient } from "kucoin-api";
import { parseDate } from "@cmn/utils/functions";
import { DEV } from "@cmn/utils/constants";
import { Platform } from "./platforms";
import { IOrderDetails } from "@cmn/utils/interfaces";

export class Kucoin extends Platform {
    client: SpotClient;

    constructor(bot: IBot, pair?: string[]) {
        super(bot, pair);
        const apiKey = process.env.KUCOIN_API_KEY!;
        const apiSecret = process.env.KUCOIN_API_SECRET!;
        const passphrase = process.env.KUCOIN_API_PASS!
        // console.log({apiKey, apiSecret, passphrase});
        this.client = new SpotClient({
            apiKey: apiKey,
            apiSecret: apiSecret,
            apiPassphrase: passphrase,
        });
    }

    async getBal(ccy?: string) {
        this.log(`\nGETTING BALANCE...\n`);
        try {
            const res = await this.client.getBalances({
                type: "trade",
                currency: ccy ?? this.bot.ccy,
            });
            if (res.code != '200000') {
                this.log(res);
                return;
            }
            return Number(res.data[0]?.available ?? 0);
        } catch (error) {
            handleErrs(error);
        }
    }
    async placeOrder({ amt, price, side, sl, clOrderId, useBaseCcy }: { amt: number; price?: number; side?: "buy" | "sell"; sl?: number; clOrderId?: string; useBaseCcy?: boolean; }): Promise<string | void | undefined | null> {

        await super.placeOrder({amt, price, side, sl, clOrderId, useBaseCcy});
        try {
            const test = this.bot.demo
            const { order_type } = this.bot;
            const is_market = price == undefined;
            if (test){
                this.log("TEST ORDER:\n")
            }
            const fn = test ? this.client.submitOrderTest.bind(this.client): this.client.submitOrder.bind(this.client)
            const res = await fn({
                symbol: this.getSymbol(),
                type: is_market ? "market" : "limit",
                side,
                size: side == 'sell' || !is_market ? amt.toString() : undefined,
                funds: side == 'buy' && is_market ? amt.toString() : undefined,
                price: price?.toString(),
                clientOid: clOrderId ?? `tb_ord_${Date.now()}`,
            });
            if (res.code != "200000") {
                this.log(res);
                return;
            }

            this.log("\nORDER PLACED SUCCESSFULLY!!\n");

            return res.data.orderId;
        } catch (error) {
            this.log("FAILED TO PLACE ORDER");
            if (DEV) console.log((error));
            handleErrs(error)
            await sleep(5000)
            // Check if order was placed
            const r = await this.client.getOrderByClientOid({clientOid: clOrderId!,})
            if (r.code != '200000')
                return this.log( "ORDER WAS NOT PLACED")
            return r.data.id
        }
    }


    async getOrderbyId(orderId: string, isAlgo = false, pair?: string[]) {
        try {
            await super.getOrderbyId(orderId, isAlgo, pair);
            let data: IOrderDetails | null = null;
            pair = pair || this.pair;

            this.log( "GETTING ORDER FOR", pair);
            const symbo = getSymbol(pair, this.bot.platform);
            const res = await this.client.getOrderByOrderId({
                orderId: orderId,
            });

            if (res.code != "200000") {
                this.log(res);
                return;
            }

            if (!res.data) {
                this.log(res);
                this.log( "ORDER NOT FOUND");
                return;
            }
            const d = res.data

            if (DEV) this.log(d);
            if (d.isActive) {
                this.log( "[Kucoin class] Order not yet filled");
                return "live";
            }

            data = parseFilledOrder(d, this.bot.platform);
            return data;
        } catch (error) {
            this.log("FAILED TO GET ORDER");
            handleErrs(error)
           
        }
    }
    async getTicker() {
        this.log( "GETTING TICKER...");
        // const res = await this.client.getTickers({
        //     symbol: this.getSymbol(),
        //     category: "spot",
        // });
        // const ticker = Number(res.result.list[0].lastPrice);
        return 0//ticker;
    }
    async getKlines({
        start,
        end,
        interval,
        pair,
        limit = 1000,
    }: {
        end?: number;
        start?: number;
        interval?: number;
        pair?: string[];
        limit?: number;
    }) {
        await super.getKlines({ start, end, interval, limit, pair });

        end =
            end ??
            getExactDate(this.bot.interval).getTime() -
                this.bot.interval * 60 * 1000;
        let klines: any[] = [];
        let cnt = 0;
        interval = interval ?? this.bot.interval;
        const symbol = pair
            ? getSymbol(pair, this.bot.platform)
            : this.getSymbol();

        this.log("[KUCOIN]: GETTING KLINES FOR:", symbol);
        const res = await this.client.getKlines({
            symbol,
            type: getInterval(interval, this.bot.platform),
            endAt: end,
        });
        
        if (res.code != '200000') {
            this.log(res);
            return this.log(
                `FAILED TO GET KLIES FOR: ${symbol} ON KUCOIN`
            );
        }
        const data = res.data
        klines = [...data].reverse();
        const d = [...klines]; //.reverse()

        const last = Number(d[d.length - 1][0]);

        this.log( { end: parseDate(end), last: parseDate(last) });
        if (end >= last + interval * 60000) {
            this.log( "END > LAST");
            return await this.getKlines({ start, end, interval, pair, limit });
        }
        return limit == 1 ? d[d.length - 1] : d;
    }

    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }

    getSymbol() {
        return getSymbol(this.pair, this.bot.platform);
    }
    async cancelOrder({ ordId, isAlgo }: { ordId: string; isAlgo?: boolean }) {
        await super.cancelOrder({ ordId, isAlgo });
        try {
            const res = await this.client.cancelOrderById({
                orderId: ordId,
            });
            if (res.code != "200000") {
                this.log( "FAILED TO CANCEL ORDER");
                this.log(res);
                return;
            }
            return res.data.cancelledOrderIds[0];
        } catch (error) {}
    }



    // async getOrderbook(
    //     symbol?: string | undefined
    // ): Promise<void | IOrderbook | null | undefined> {
    //     try {
    //         const res = await this.client.getOrderbook({
    //             symbol: this._getSymbol(),
    //             category: "spot",
    //         });
    //         if (res.retCode != 0) {
    //             this.log( res);
    //             return this.log( "FAILED TO GET ORDERBOOK");
    //         }
    //         const data = res.result;

    //         const ob: IOrderbook = {
    //             ts: parseDate(Number(res.result.ts)),
    //             bids: data.b.map((el) => ({
    //                 px: Number(el[0]),
    //                 amt: Number(el[1]),
    //                 cnt: 1,
    //             })),
    //             asks: data.a.map((el) => ({
    //                 px: Number(el[0]),
    //                 amt: Number(el[1]),
    //                 cnt: 1,
    //             })),
    //         };
    //         return ob
    //     } catch (e) {
    //         this.log( "FAILED TO GET ORDERBOOK");
    //     }
    // }
    async withdraw({ amt, coin, chain, addr }: { amt: number; coin: string; chain: string; addr: string; }) {
        super.withdraw({amt, coin, chain, addr})
        try {
            const res = await this.client.submitWithdraw({
                currency: coin, chain, amount: amt, address: addr
            })
            if (res.code != "200000") {
                this.log( "FAILED TO WITHDRAW");
                this.log(res);
                return;
            }
            return res.data.withdrawalId
        } catch (err) {
            handleErrs(err)
        }
    }
}
