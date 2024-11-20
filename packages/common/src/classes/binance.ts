import { IBot } from "@cmn/models/bot";
import { getExactDate, parseFilledOrder } from "@cmn/utils/funcs2";
import { capitalizeFirstLetter, getSymbol, handleErrs } from "@cmn/utils/functions";
import { botLog } from "@cmn/utils/bend/functions";
import { parseDate } from "@cmn/utils/functions";
import { writeFileSync } from "node:fs";
import { DEV, isStopOrder } from "@cmn/utils/constants";
import { IOrderDetails, IOrderbook } from "@cmn/utils/interfaces";
import { Platform } from "./platforms";
import { MainClient, SymbolPrice } from "binance";

export class Binance extends Platform {
    apiKey: string;
    apiSecret: string;
    client: MainClient;

    constructor(bot: IBot) {
        super(bot);

        this.apiKey = this.bot.demo
            ? process.env.BINANCE_API_KEY!
            : process.env.BINANCE_API_KEY!;
        this.apiSecret = this.bot.demo
            ? process.env.BINANCE_API_SECRET!
            : process.env.BINANCE_API_SECRET!;
        this.client = new MainClient({
            api_key:  this.apiKey,
            api_secret: this.apiSecret,
        });
    }
    

    async getBal(ccy?: string) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getWalletBalances();
           
            return Number(res.find(el=> el.walletName == ccy).balance);
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
            const is_market = price == undefined;
            const res = await this.client.submitNewOrder({
                symbol: this.getSymbol(),
                type: is_market ? "MARKET" : "LIMIT",
                side: capitalizeFirstLetter(side),
                quantity: amt,
                price,
                timeInForce: "GTC",
                newClientOrderId: clOrderId,
            });
         
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);

            return `${res.orderId}`;
        } catch (error) {
            this._log("Failed to place order")
            handleErrs(error)
        }
    }

    async getOrderbyId(orderId: string, isAlgo = false, pair?: string[]) {
        try {
            let data: IOrderDetails | null = null;
            pair = pair ?? [this.bot.base, this.bot.ccy];

            botLog(this.bot, "GETTING ORDER FOR", pair);
            const symbo = getSymbol(pair, this.bot.platform);
            const res = await this.client.getOrder({
                symbol: symbo,
                orderId: Number(orderId),
            });

           

            if (res.status != "FILLED") {
                this._log("Order not yet filled");
                return "live";
            }

            data = parseFilledOrder(res, this.bot.platform);
            return data;
        } catch (error) {
            this._log("Failed to get order")
            handleErrs(error)
        }
    }
    async getTicker() {
        botLog(this.bot, "GETTING TICKER...");
        const res = await this.client.getSymbolPriceTicker({
            symbol: this.getSymbol(),
        });
        const ticker = (res as SymbolPrice).price;
        console.log({ ticker });
        return ticker;
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
        end =
            end ??
            getExactDate(this.bot.interval).getTime() -
                this.bot.interval * 60 * 1000;
        let klines: any[] = [];
        let cnt = 0;
        // interval = interval ?? this.bot.interval;
        // const symbol = pair
        //     ? getSymbol(pair, this.bot.platform)
        //     : this.getSymbol();

        // console.log("[BINANCE]: GETTING KLINES FOR:", symbol);
        // const res = await this.client.getKline({
        //     symbol,
        //     interval: interval as any,
        //     end: end,
        //     limit: 200,
        //     category: this.bot.category as any,
        // });
        // let data = res.result.list;
        // if (!data) {
        //     console.log(res);
        //     return botLog(
        //         this.bot,
        //         `FAILED TO GET KLIES FOR: ${symbol} ON BINANCE`
        //     );
        // }
        // klines = [...data].reverse();
        // const d = [...klines]; //.reverse()

        // const last = Number(d[d.length - 1][0]);

        // botLog(this.bot, { end: parseDate(end), last: parseDate(last) });
        // if (end >= last + interval * 60000) {
        //     botLog(this.bot, "END > LAST");
        //     return await this.getKlines({ start, end, interval, pair, limit });
        // }
        // return limit == 1 ? d[d.length - 1] : d;
    }

    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }

    getSymbol() {
        return `${this.bot.base}${this.bot.ccy}`;
    }
    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            // const res = await this.client.cancelOrder({
            //     orderId: ordId,
            //     symbol: this.getSymbol(),
            //     category: this.bot.category as any,
            // });
            // if (res.retCode != 0) {
            //     botLog(this.bot, "FAILED TO CANCEL ORDER");
            //     console.log(res);
            //     return;
            // }
            // return res.result.orderId;
        } catch (error) {}
    }

    async getCurrencies() {
        // try {
        //     const res = await this.client.getCoinInfo();
        //     return res;
        // } catch (e) {
        //     console.log(e);
        // }
    }

    async getOrderbook(
        symbol?: string | undefined
    ): Promise<void | IOrderbook | null | undefined> {
        // try {
        //     const res = await this.client.getOrderbook({
        //         symbol: this._getSymbol(),
        //         category: "spot",
        //     });
        //     if (res.retCode != 0) {
        //         botLog(this.bot, res);
        //         return botLog(this.bot, "FAILED TO GET ORDERBOOK");
        //     }
        //     const data = res.result;

        //     const ob: IOrderbook = {
        //         ts: parseDate(Number(res.result.ts)),
        //         bids: data.b.map((el) => ({
        //             px: Number(el[0]),
        //             amt: Number(el[1]),
        //             cnt: 1,
        //         })),
        //         asks: data.a.map((el) => ({
        //             px: Number(el[0]),
        //             amt: Number(el[1]),
        //             cnt: 1,
        //         })),
        //     };
        //     return ob
        // } catch (e) {
        //     botLog(this.bot, "FAILED TO GET ORDERBOOK");
        //     console.log(e);
        // }
    }

    async withdraw({ amt, coin, chain, addr }: { amt: number; coin: string; chain: string; addr: string; }): Promise<string | null | void | undefined> {
        super.withdraw({amt, coin,chain, addr})
        try{
            const r = await this.client.withdraw({coin, network: chain, address: addr, amount: amt});
           
            return r.id
        }
        catch(e){
            this._log(`Failed to withdraw ${amt} of ${coin} through ${chain}`)
            handleErrs(e)
        }
    }
}
