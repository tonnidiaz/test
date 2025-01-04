import { getInterval, parseFilledOrder } from "@cmn/utils/funcs2";
import { RestClientV2 } from "bitget-api";
import { botLog } from "@cmn/utils/bend/functions";
import { handleErrs, parseDate } from "@cmn/utils/functions";
import { IBot } from "@cmn/models/bot";
import { capitalizeFirstLetter, getSymbol, sleep } from "@cmn/utils/functions";
import { IOrderDetails } from "@cmn/utils/interfaces";
import { DEV } from "@cmn/utils/constants";
import { Platform } from "./platforms";

export class Bitget extends Platform {
    name = "BITGET";
    maker: number = 0.1 / 100;
    taker: number = 0.1 / 100;
    client: RestClientV2;
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    constructor(bot: IBot, pair?: string[]) {
        super(bot, pair);
        this.apiKey = process.env.BITGET_API_KEY!;
        this.apiSecret = process.env.BITGET_API_SECRET!;
        this.passphrase = process.env.BITGET_PASSPHRASE!;
        this.client = new RestClientV2({
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
            apiPass: this.passphrase,
        });
    }

    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
        isBybit,
    }: {
        end?: number | undefined;
        start?: number | undefined;
        interval: number;
        symbol: string;
        savePath?: string | undefined;
        isBybit?: boolean;
    }) {
        try {
            interval = interval ?? this.bot.interval;
            end = end ?? Date.now() - interval * 60000;

            let klines: any[] = [];
            let done = false;
            symbol = symbol ?? this.getSymbol();

            const _interval = getInterval(interval, this.bot.platform);
            this.log(`[ BITGET GETTING KLINES.. FOR ` + symbol);

            const res = await this.client.getSpotCandles({
                symbol,
                granularity: _interval,
                endTime: `${end + interval * 60000}`,
            });

            const { data } = res;
            klines = [...data];

            let d = [...klines];
            const last = Number(d[d.length - 1][0]);

            this.log( { end: parseDate(end), last: parseDate(last) });
            if (end >= last + interval * 60000) {
                this.log( "END > LAST");
                await sleep(200)
                return await this.getKlines({ start, end, interval, symbol });
            }
            return d;
        } catch (e: any) {
            this.log('Failed to get klines')
            handleErrs(e);
        }
    }

    async getBal(ccy?: string) {
        this.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getSpotAccountAssets({
                coin: ccy ?? this.bot.ccy,
            });
            if (res.code != "00000") {
                this.log(res);
                return;
            }
            return Number(res.data[0].available);
        } catch (error) {
            this.log("Failed to get balance");
            handleErrs(error)
        }
    }
    async placeOrder({ amt, price, side, sl, clOrderId, useBaseCcy }: { amt: number; price?: number; side?: "buy" | "sell"; sl?: number; clOrderId?: string; useBaseCcy: boolean; }): Promise<string | void | undefined | null> {

        await super.placeOrder({amt, price, side, sl, clOrderId, useBaseCcy});

        const pair = this.pair;
        const ordType = price == undefined ? "market" : "limit";
        
        try {
            const { order_type } = this.bot;

            const res = await this.client.spotSubmitOrder({
                symbol: getSymbol(pair, this.bot.platform),
                orderType: ordType,
                side: capitalizeFirstLetter(side),
                size: amt.toString(),
                price: price?.toString(),
                clientOid: clOrderId,
                force: "gtc",
            });

            if (res.code != "00000") {
                this.log(res);
                return;
            }
            this.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);

            return res.data.orderId;
        } catch (error) {
            this.log("Failed to place order")
            handleErrs(error);
        }
    }
    async getOrderbyId(orderId: string, isAlgo = false) {
        try {
            let data: IOrderDetails | null = null;

            this.log( "GETTING ORDER...");
            const res = await this.client.getSpotOrder({
                orderId: orderId,
            });

            if (res.code != "00000") {
                this.log(res);
                return;
            }
            const list = res.data;

            if (!list[0]) {
                this.log(res);
                this.log( "ORDER NOT FOUND");
                return;
            }
            const d = list[0];

            if (DEV) this.log(d);
            if (list[0].status != "filled") {
                this.log( "Order not yet filled", {
                    status: list[0].status,
                });
                return "live";
            }

            data = parseFilledOrder(d, this.bot.platform);
            return data;
        } catch (error) {
            this.log('Failed to get order')
            handleErrs(error);
        }
    }
    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            const res = await this.client.spotCancelOrder({
                symbol: this.getSymbol(),
                orderId: ordId,
            });
            if (res.code != "00000") {
                this.log(res);
                return;
            }

            return res.data.orderId;
        } catch (e: any) {
            this.log( "FAILED TO CANCEL ORDER");
            handleErrs(e)
        }
    }
    getSymbol() {
        return getSymbol(this.pair, this.bot.platform);
    }
    async withdraw({ amt, coin, chain, addr }: { amt: number; coin: string; chain: string; addr: string; }) {
        super.withdraw({amt, coin, chain, addr})
        try {
            const res = await this.client.spotWithdraw({
                coin: coin, chain, size : amt.toString(), address: addr, transferType: "on_chain"
            })
            if (res.code != "200000") {
                this.log( "FAILED TO WITHDRAW");
                this.log(res);
                return;
            }
            return res.data.orderId
        } catch (err) {
            this.log('Failed to withdraw')
            handleErrs(err)
        }
    }
}
