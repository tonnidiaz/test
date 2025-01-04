import { IBot } from "@cmn/models/bot";
import {
    getInterval,
    parseFilledOrder,
    getExactDate,
} from "@cmn/utils/funcs2";
import {  getSymbol, handleErrs, sleep, timedLog } from "@cmn/utils/functions";
import { writeFileSync } from "node:fs";
import { RestClient, WebsocketClient } from "okx-api";
import type { AlgoOrderResult, OrderDetails, OrderResult } from "okx-api";
import { DEV } from "@cmn/utils/constants";
import { configDotenv } from "dotenv";
import { IOrderDetails, IOrderbook } from "@cmn/utils/interfaces";
import { Platform } from "./platforms";
import { parseDate } from "@cmn/utils/functions";
configDotenv();

const { env } = process;

export class OKX extends Platform {
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    client: RestClient;
    ws: WebsocketClient | null = null;
    maxRetries = 5
    retries: number

    constructor(bot: IBot, pair?: string[]) {
        super(bot, pair);
        this.retries = 0
        this.flag = this.bot.demo ? "1" : "0";
        this.apiKey = this.bot.demo ? env.OKX_API_KEY_DEMO! : env.OKX_API_KEY!;
        this.apiSecret = this.bot.demo
            ? env.OKX_API_SECRET_DEMO!
            : env.OKX_API_SECRET!;
        this.passphrase = this.bot.demo
            ? env.OKX_PASSPHRASE_DEMO!
            : env.OKX_PASSPHRASE!;
        this.client = new RestClient(
            {
                apiKey: this.apiKey,
                apiSecret: this.apiSecret,
                apiPass: this.passphrase,
            },
            this.bot.demo ? "demo" : "prod"
        );
    }

    async getBal(ccy?: string) {
        await super.getBal(ccy);
        try {
            const res = await this.client.getBalance(ccy || this.pair[1]);
            return Number(res[0].details[0].availBal);
        } catch (error) {
            handleErrs(error);
        }
    }

    async getTicker() {
        this.log("GETTING TICKER...");
        const res = await this.client.getTicker(this.getSymbol());
        const ticker = Number(res[0].last);
        this.log({ ticker });
        return ticker;
    }

    async cancelOrder({ ordId, isAlgo }: { ordId: string; isAlgo?: boolean }) {
        await super.cancelOrder({ ordId, isAlgo });
        try {
            this.log("CANCELLING ORDER...");
            const res = await (isAlgo
                ? this.client.cancelAlgoOrder([
                      { algoId: ordId, instId: this.getSymbol() },
                  ])
                : this.client.cancelOrder({
                      ordId,
                      instId: this.getSymbol(),
                  }));

            if (res[0].sCode != "0") {
                this.log("FAILED TO CANCEL ORDER");
                this.log(res[0]);
                return;
            }
            return ordId;
        } catch (error) {
            handleErrs(error)
        }
    }
    
    async placeOrder({ amt, price, side, sl, clOrderId, useBaseCcy }: { amt: number; price?: number; side?: "buy" | "sell"; sl?: number; clOrderId?: string; useBaseCcy: boolean; }): Promise<string | void | undefined | null> {
        /**
         * tgtCcy - default: quoetCcy for buy, baseCcy for sell
         */

        await super.placeOrder({amt, price, side, sl, clOrderId, useBaseCcy});
        const symbol = getSymbol(this.pair, this.bot.platform)
        try {
            let res: OrderResult[] | AlgoOrderResult[];

            if (side == "buy") {
                res = await this.client.submitOrder({
                    instId: this.getSymbol(),
                    tdMode: "cash",
                    ordType: "market",
                    side,
                    sz: amt.toString(),
                    clOrdId: clOrderId,
                    // tgtCcy: useBaseCcy ? 'base_ccy' : 'quote_ccy'
                    //px: price.toString(),
                });
            } else {
                if (price) {
                    res = await this.client.placeAlgoOrder({
                        instId: this.getSymbol(),
                        tdMode: "cash",
                        ordType: "conditional",
                        tpTriggerPx: price.toString(),
                        //slTriggerPx: sl.toString(),
                        side,
                        sz: amt.toString(),
                        tpOrdPx:
                            this.bot.order_type == "Market"
                                ? "-1"
                                : (price * (1 - 0.0 / 100)).toString(),
                        /* slOrdPx:
                              this.bot.order_type == "Market"
                                  ? "-1"
                                  : (sl * (1 - 0.0 / 100)).toString(), */
                        algoClOrdId: clOrderId,
                    });
                } else {
                    res = await this.client.submitOrder({
                        instId: this.getSymbol(),
                        tdMode: "cash",
                        ordType: "market",
                        side,
                        sz: amt.toString(),
                        clOrdId: clOrderId,
                        //px: price.toString(),
                    });
                }
            }

            if (res[0].sCode != "0") {
                this.log("FAILED TO PLACE ORDER", res[0]);
                // this.retries += 1
                // if (this.retries <= this.maxRetries){
                //     this.log(`Retrying [${this.retries} / ${this.maxRetries}]...`)
                //     await sleep(2000)
                //     return await this.placeOrder(amt, price, side, sl, clOrderId)
                // }
                return;
            }
            this.log("\nORDER PLACED SUCCESSFULLY!!\n");
            const d: any = res[0];
            const id: string =
                side == "buy" ? d.ordId : price ? d.algoId : d.ordId;
            return id;
        } catch (error) {
            this.log(`FAILED TO PLACE ORDER`);
            handleErrs(error)
            await sleep(5000)
            // Check if order was placed
            const r = await this.client.getOrderDetails({clOrdId: clOrderId, instId: symbol})
            if (!r.length)
                return this.log(`ORDER NOT PLACED`)
            return r[0].ordId
            // this.retries += 1
            //     if (this.retries <= this.maxRetries){
            //         this.log(`Retrying [${this.retries} / ${this.maxRetries}]...`)
            //         await sleep(2000)
            //         return await this.placeOrder(amt, price, side, sl, clOrderId)
            //     }
        }
    }

    async getOrderbyId(
        orderId: string,
        isAlgo = false,
        pair?: string[]
    ): Promise<IOrderDetails | null | "live" | undefined> {
        await super.getOrderbyId(orderId, isAlgo, pair);
        try {
            pair = pair || this.pair;
            let data: IOrderDetails | null = null;
            let finalRes: OrderDetails | null = null;

            const symbo = getSymbol(pair, this.bot.platform);
            const res = isAlgo
                ? await this.client.getAlgoOrderDetails({ algoId: orderId })
                : await this.client.getOrderDetails({
                      ordId: orderId!,
                      instId: symbo,
                  });
            if (DEV) {
                this.log(res);
            }
            if (isAlgo && res[0].state == "effective") {
                this.log("IS_EFFECTIVE");
                return await this.getOrderbyId(res[0].ordId);
            } else if (!isAlgo) {
                if (res[0].state == "live") return "live";
                else if (res[0].state == "filled") finalRes = res[0];
            }
            if (!finalRes) {
                this.log("[OKX Class] ORDER NOT YET FILLED");
                return "live";
            }
            data = parseFilledOrder(finalRes, this.bot.platform);

            return data;
        } catch (error: any) {
            this.log("ERROR");
            handleErrs(error);
            if (isAlgo && error?.code == "51603")
                return await this.getOrderbyId(orderId);
        }
    }

    async setLev(val: number) {
        const res = await this.client.setLeverage({
            instId: this.getSymbol(),
            mgnMode: "isolated",
            lever: `${val}`,
        });
        this.log(res);
    }

    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }
    async getKlines({
        start,
        end,
        interval,
        limit = 100,
        pair,
    }: {
        end?: number;
        start?: number;
        interval?: number;
        pair?: string[];
        limit?: number;
    }) {
        await super.getKlines({ start, end, interval, limit, pair });
        const symbol = pair
            ? getSymbol(pair, this.bot.platform)
            : this.getSymbol();
        try {
            let klines: any[] = [];
            let cnt = 0;
            interval = interval ?? this.bot.interval;
            end =
                end ?? getExactDate(interval).getTime() - interval * 60 * 1000;
            end += interval * 60000;

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

            let d = [...klines];
            if (!d.length) {
                this.log(res);
                return this.log(
                    "FAILED TO GET KLINES FOR ",
                    symbol,
                    "ON OKX"
                );
            }
            const last = Number(d[d.length - 1][0]);

            this.log({ end: parseDate(end), last: parseDate(last) });
            if (end >= last + 2 * interval * 60000) {
                this.log("END > LAST");
                end -= interval * 60000;
                return await this.getKlines({
                    start,
                    end,
                    interval,
                    pair,
                    limit,
                });
            }
            const lastCandle = d[d.length - 1];

            return limit == 1 ? d[d.length - 1] : d;
        } catch (e) {
            this.log("FAILED TO GET KLINES FOR ", symbol, "ON OKX");
            handleErrs(e);
        }
    }

    getSymbol() {
        return this.pair.join('-');
    }

    async getCurrencies() {
        try {
            const res = await this.client.getCurrencies();
            return res;
        } catch (e) {
            this.log(e);
        }
    }
    async getOrderbook(
        symbol?: string | undefined
    ): Promise<void | IOrderbook | null | undefined> {
        try {
            const res = await this.client.getOrderBook(this._getSymbol(), "1");
            const ob: IOrderbook = {
                ts: parseDate(Number(res[0].ts)),
                bids: res[0].bids.map((el) => ({ px: Number(el[0]), amt: Number(el[1]), cnt: Number(el[3]) })),
                asks: res[0].asks.map((el) => ({ px: Number(el[0]), amt: Number(el[1]), cnt: Number(el[3]) })),
            };
            return ob
        } catch (e) {
            this.log("FAILED TO GET ORDERBOOK");
            handleErrs(e);
        }
    }
    async withdraw({ amt, coin, chain, addr }: { amt: number; coin: string; chain: string; addr: string; }) {
        super.withdraw({amt, coin, chain, addr})
        try {
            const res = await this.client.submitWithdraw({
                ccy: coin, chain, amt: amt.toString(), toAddr: addr, dest: "3", fee: "0"
            })
            return res[0].wdId
        } catch (err) {
            handleErrs(err)
        }
    }
}
