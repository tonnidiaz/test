import { IBot } from "@cmn/models/bot";
import { getExactDate, getInterval, parseDate, parseFilledOrder } from "@cmn/utils/funcs2";
import { botLog, capitalizeFirstLetter, getSymbol, sleep } from "@cmn/utils/functions";
import { SpotClient } from "kucoin-api";
import { writeFileSync } from "fs";
import { DEV, isStopOrder } from "@cmn/utils/constants";
import { Platform } from "./platforms";
import type { SpotOrder } from "kucoin-api";
import { IOrderDetails } from "@cmn/utils/interfaces";

export class Kucoin extends Platform {
    client: SpotClient;

    constructor(bot: IBot) {
        super(bot);

        const apiKey = process.env.KUCOIN_API_KEY!;
        const apiSecret = process.env.KUCOIN_API_SECRET!;
        const passphrase = process.env.KUCOIN_API_PASS!
        //console.log({apiKey, apiSecret, passphrase})
        this.client = new SpotClient({
            apiKey: apiKey,
            apiSecret: apiSecret,
            apiPassphrase: passphrase,
        });
    }

    async getBal(ccy?: string) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getBalances({
                type: "trade",
                currency: ccy ?? this.bot.ccy,
            });
            if (res.code != '200000') {
                console.log(res);
                return;
            }
            return Number(res.data[0]?.available ?? 0);
        } catch (error) {
            console.log(error);
        }
    }
    async placeOrder(
        amt: number,
        price?: number,
        side: "buy" | "sell" = "buy",
        sl?: number,
        clOrderId?: string,
        test = false
    ) {
        await super.placeOrder(amt, price, side, sl, clOrderId);
        try {
            const { order_type } = this.bot;
            const is_market = price == undefined;
            if (test){
                console.log("TEST ORDER:\n")
            }
            const res = await this.client.submitOrder({
                symbol: this.getSymbol(),
                type: is_market ? "market" : "limit",
                side,
                size: side == 'sell' || !is_market ? amt.toString() : undefined,
                funds: side == 'buy' && is_market ? amt.toString() : undefined,
                price: price?.toString(),
                clientOid: clOrderId ?? `tb_ord_${Date.now()}`,
            });
            if (res.code != "200000") {
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);

            return res.data.orderId;
        } catch (error) {
            botLog(this.bot,"FAILED TO PLACE ORDER", error);
            await sleep(5000)
            // Check if order was placed
            const r = await this.client.getOrderByClientOid({clientOid: clOrderId!,})
            if (r.code != '200000')
                return botLog(this.bot, "ORDER WAS NOT PLACED")
            return r.data.id
        }
    }
    async placeTestOrder( amt: number,
        price?: number,
        side: "buy" | "sell" = "buy",
        sl?: number,
        clOrderId?: string){
            return await this.placeOrder(amt, price, side, sl, clOrderId, true)
        }

    async getOrderbyId(orderId: string, isAlgo = false, pair?: string[]) {
        try {
            await super.getOrderbyId(orderId, isAlgo, pair);
            let data: IOrderDetails | null = null;
            pair = pair ?? [this.bot.base, this.bot.ccy];

            botLog(this.bot, "GETTING ORDER FOR", pair);
            const symbo = getSymbol(pair, this.bot.platform);
            const res = await this.client.getOrderByOrderId({
                orderId: orderId,
            });

            if (res.code != "200000") {
                console.log(res);
                return;
            }

            if (!res.data) {
                console.log(res);
                botLog(this.bot, "ORDER NOT FOUND");
                return;
            }
            const d = res.data

            if (DEV) console.log(d);
            if (d.isActive) {
                botLog(this.bot, "[Kucoin class] Order not yet filled");
                return "live";
            }

            data = parseFilledOrder(d, this.bot.platform);
            return data;
        } catch (error) {
            botLog(this.bot,"FAILED TO GET ORDER", error);
           
        }
    }
    async getTicker() {
        botLog(this.bot, "GETTING TICKER...");
        // const res = await this.client.getTickers({
        //     symbol: this.getSymbol(),
        //     category: "spot",
        // });
        // const ticker = Number(res.result.list[0].lastPrice);
        // console.log({ ticker });
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

        console.log("[KUCOIN]: GETTING KLINES FOR:", symbol);
        const res = await this.client.getKlines({
            symbol,
            type: getInterval(interval, this.bot.platform),
            endAt: end,
        });
        
        if (res.code != '200000') {
            console.log(res);
            return botLog(
                this.bot,
                `FAILED TO GET KLIES FOR: ${symbol} ON KUCOIN`
            );
        }
        const data = res.data
        klines = [...data].reverse();
        const d = [...klines]; //.reverse()

        const last = Number(d[d.length - 1][0]);

        botLog(this.bot, { end: parseDate(end), last: parseDate(last) });
        if (end >= last + interval * 60000) {
            botLog(this.bot, "END > LAST");
            return await this.getKlines({ start, end, interval, pair, limit });
        }
        return limit == 1 ? d[d.length - 1] : d;
    }

    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }

    getSymbol() {
        return getSymbol([this.bot.base, this.bot.ccy], this.bot.platform);
    }
    async cancelOrder({ ordId, isAlgo }: { ordId: string; isAlgo?: boolean }) {
        await super.cancelOrder({ ordId, isAlgo });
        try {
            const res = await this.client.cancelOrderById({
                orderId: ordId,
            });
            if (res.code != "200000") {
                botLog(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res);
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
    //             botLog(this.bot, res);
    //             return botLog(this.bot, "FAILED TO GET ORDERBOOK");
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
    //         botLog(this.bot, "FAILED TO GET ORDERBOOK");
    //         console.log(e);
    //     }
    // }
}
