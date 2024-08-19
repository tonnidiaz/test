import { getInterval, parseDate, parseFilledOrder } from "@/utils/funcs2";
import { ensureDirExists } from "@/utils/orders/funcs";
import { Platform } from "./test-platforms";
import { RestClientV2 } from "bitget-api";
import { writeFileSync } from "fs";
import { CompanyResultSortBy } from "indicatorts";
import { IBot } from "@/models/bot";
import { botLog, capitalizeFirstLetter, getSymbol } from "@/utils/functions";
import { IOrderDetails } from "@/utils/interfaces";
import { DEV } from "@/utils/constants";

export class Bitget {
    name = "BITGET";
    maker: number = 0.1 / 100; 
    taker: number = 0.1 / 100;
    client: RestClientV2;
    apiKey: string;
    apiSecret: string;
    passphrase: string;
    bot: IBot;

    constructor(bot: IBot ) {
        this.apiKey =  process.env.BITGET_API_KEY!;
        this.apiSecret = process.env.BITGET_API_SECRET!;
        this.passphrase = process.env.BITGET_PASSPHRASE!;

        this.bot = bot

        this.client = new RestClientV2({apiKey: this.apiKey, apiSecret: this.apiSecret, apiPass: this.passphrase});
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
        end = end ?? Date.now() - interval * 60000;

        const END = end;
        const diff = (10000 - 30) * interval * 60000;
        const MIN_DATE = end - diff;

    

        let klines: any[] = [];
        let done = false;
        let cnt = 0;
        console.log(
            `[ BITGET GETTING KLINES.. FOR ` +
                symbol
        );

        if (start) {
            start =
                (isBybit ? start : start) /* - interval * 60 * 1000 */ -
                20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
        }

            const res = await this.client.getSpotHistoricCandles({
                symbol,
                granularity: getInterval(interval, "bitget"),
                endTime: end,
            });

            const { data } = res;
            klines = [...data];
        

        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
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
        const pair = [this.bot.base, this.bot.ccy]
        const od = { price, sl, amt, side };

        const ordType = price == undefined ? 'market' : 'limit'
        botLog(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            const { order_type } = this.bot;
          
          const  res = await this.client.spotSubmitOrder({
                symbol: getSymbol(pair, this.bot.platform),
                orderType:  ordType,
                side: capitalizeFirstLetter(side),
                size: amt.toString(),
                price: price?.toString(),
                clientOid: clOrderId});

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
            const list =  res.data;

            if (!list[0]) {
                console.log(res);
                botLog(this.bot, "ORDER NOT FOUND");
                return;
            }
            const d = list[0];

            if (DEV) console.log(d);
            if (list[0].status != "filled") {
                
                botLog(this.bot, "Order not yet filled", {status: list[0].status});
                return "live";
            }

            data = parseFilledOrder(d, this.bot.platform);
            return data;
        } catch (error) {
            console.log(error);
        }
    }
}
