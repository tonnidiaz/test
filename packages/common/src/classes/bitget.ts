import { getInterval, parseDate, parseFilledOrder } from "@cmn/utils/funcs2";
import { ensureDirExists } from "@cmn/utils/orders/funcs";
import { TestPlatform } from "./test-platforms";
import { RestClientV2 } from "bitget-api";
import { writeFileSync } from "fs";
import { CompanyResultSortBy } from "indicatorts";
import { IBot } from "@cmn/models/bot";
import { botLog, capitalizeFirstLetter, getSymbol, sleep } from "@cmn/utils/functions";
import { IOrderDetails } from "@cmn/utils/interfaces";
import { DEV } from "@cmn/utils/constants";

export class Bitget {
    name = "BITGET";
    maker: number = 0.1 / 100;
    taker: number = 0.1 / 100;
    client: RestClientV2;
    apiKey: string;
    apiSecret: string;
    passphrase: string;
    bot: IBot;

    constructor(bot: IBot) {
        this.apiKey = process.env.BITGET_API_KEY!;
        this.apiSecret = process.env.BITGET_API_SECRET!;
        this.passphrase = process.env.BITGET_PASSPHRASE!;
        this.bot = bot;
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
            console.log(`[ BITGET GETTING KLINES.. FOR ` + symbol);

            const res = await this.client.getSpotCandles({
                symbol,
                granularity: _interval,
                endTime: `${end + interval * 60000}`,
            });

            const { data } = res;
            klines = [...data];

            let d = [...klines];
            const last = Number(d[d.length - 1][0]);

            botLog(this.bot, { end: parseDate(end), last: parseDate(last) });
            if (end >= last + interval * 60000) {
                botLog(this.bot, "END > LAST");
                await sleep(200)
                return await this.getKlines({ start, end, interval, symbol });
            }
            return d;
        } catch (e: any) {
            console.log(e);
        }
    }

    async getBal(ccy?: string) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getSpotAccountAssets({
                coin: ccy ?? this.bot.ccy,
            });
            if (res.code != "00000") {
                console.log(res);
                return;
            }
            return Number(res.data[0].available);
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
        const pair = [this.bot.base, this.bot.ccy];
        const od = { price, sl, amt, side };

        const ordType = price == undefined ? "market" : "limit";
        botLog(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
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
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);

            return res.data.orderId;
        } catch (error) {
            console.log(error);
        }
    }
    async getOrderbyId(orderId: string, isAlgo = false) {
        try {
            let data: IOrderDetails | null = null;

            botLog(this.bot, "GETTING ORDER...");
            const res = await this.client.getSpotOrder({
                orderId: orderId,
            });

            if (res.code != "00000") {
                console.log(res);
                return;
            }
            const list = res.data;

            if (!list[0]) {
                console.log(res);
                botLog(this.bot, "ORDER NOT FOUND");
                return;
            }
            const d = list[0];

            if (DEV) console.log(d);
            if (list[0].status != "filled") {
                botLog(this.bot, "Order not yet filled", {
                    status: list[0].status,
                });
                return "live";
            }

            data = parseFilledOrder(d, this.bot.platform);
            return data;
        } catch (error) {
            console.log(error);
        }
    }
    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            const res = await this.client.spotCancelOrder({
                symbol: this.getSymbol(),
                orderId: ordId,
            });
            if (res.code != "00000") {
                console.log(res);
                return;
            }

            return res.data.orderId;
        } catch (e: any) {
            console.log(e);
            botLog(this.bot, "FAILED TO CANCEL ORDER");
        }
    }
    getSymbol() {
        return getSymbol([this.bot.base, this.bot.ccy], this.bot.platform);
    }
}
