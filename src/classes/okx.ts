import { IBot } from "@/models/bot";
import { ensureDirExists } from "@/utils/orders/funcs";
import { parseDate } from "@/utils/funcs2";
import { botLog, getCoinPrecision, getPricePrecision } from "@/utils/functions";
import axios from "axios";
import { writeFileSync } from "fs";
import { RestClient } from "okx-api";
import type {
    OrderResult,
    AlgoOrderDetailsResult,
    AlgoOrderResult,
    OrderDetails,
} from "okx-api";
export class OKX {
    bot: IBot;
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    client: RestClient;
    constructor(bot: IBot) {
        console.log(
            `\nInit OKX For Bot=${bot.name}\tMode=${
                bot.demo ? "demo" : "live"
            }\n`
        );
        this.bot = bot;
        this.flag = this.bot.demo ? "1" : "0";
        this.apiKey = this.bot.demo
            ? process.env.OKX_API_KEY_DEV!
            : process.env.OKX_API_KEY!;
        this.apiSecret = this.bot.demo
            ? process.env.OKX_API_SECRET_DEV!
            : process.env.OKX_API_SECRET!;
        this.passphrase = process.env.OKX_PASSPHRASE!;

        this.client = new RestClient(
            {
                apiKey: this.apiKey,
                apiSecret: this.apiSecret,
                apiPass: this.passphrase,
            },
            this.bot.demo ? "demo" : "prod"
        );
        botLog(this.bot, "OKX INITIALIZED");
    }

    async getBal(ccy?: string) {
        console.log(`\nGETTING BALANCE FOR BOT=${this.bot.name}\n`);
        try {
            const res = await this.client.getBalance(ccy ?? this.bot.ccy);
            return Number(res[0].details[0].availBal);
        } catch (error) {
            console.log(error);
        }
    }

    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            const res = await this.client.cancelOrder({
                ordId,
                instId: this.getSymbol(),
            });
            if (res[0].sCode != "0") {
                botLog(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res[0]);
                return;
            }
            return res[0].ordId;
        } catch (error) {}
    }
    async placeOrder(
        amt: number,
        price: number,
        side: "buy" | "sell" = "buy",
        sl?: number
    ) {
        /* Place limit order at previous close */
        const od = { price, sl, amt, side };
        botLog(this.bot, `PLACING ORDER: ${JSON.stringify(od)}`);
        try {
            const res = await this.client.submitOrder({
                instId: this.getSymbol(),
                tdMode: "cash",
                ordType: "market",
                side,
                sz: amt.toString(),
                //px: price.toString(),
                
            });

            if (res[0].sCode != "0") {
                console.log(res[0]);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);
            return res[0].ordId;
        } catch (error) {
            console.log(error);
        }
    }

    async getOrderbyId(orderId: string, isAlgo = false) {
        try {
            let data: {
                id: string;
                fillTime: number;
                fillSz: number;
                fillPx: number;
                fee: number;
            } | null = null;
            let finalRes: OrderDetails | null = null;

            const res = false
                ? await this.client.getAlgoOrderDetails({ algoId: orderId })
                : await this.client.getOrderDetails({
                      ordId: orderId!,
                      instId: this.getSymbol(),
                  });
            if (isAlgo && res[0].state == "effective") {
                const res2 = (
                    await this.client.getOrderDetails({
                        instId: this.getSymbol(),
                        ordId: res[0].ordId,
                    })
                )[0];
                finalRes = res2[0];
            } else if (!isAlgo && res[0].state == "filled") {
                finalRes = res[0];
            }
            if (!finalRes) {
                botLog(this.bot, "[OKX Class] ORDER NOT YET FILLED");
                return "live";
            }
            console.log(finalRes);
            data = {
                id: finalRes.ordId,
                fillPx: Number(finalRes.avgPx),
                fillSz: Number(finalRes.accFillSz),
                fee: Number(finalRes.fee),
                fillTime: Number(finalRes.fillTime),
            };

            return data;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    async setLev(val: number) {
        const res = await this.client.setLeverage({
            instId: this.getSymbol(),
            mgnMode: "isolated",
            lever: `${val}`,
        });
        console.log(res);
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
        botLog(this.bot, "GETTING KLINES.. FOR " + symbol);

        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                console.log(`GETTING ${cnt + 1} KLINES...`);
                const limit = 100;
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(
                    `Before: ${parseDate(
                        new Date(firstTs)
                    )} \t After: ${parseDate(new Date(after))}`
                );
                const res = await axios.get(
                    `https://okx.com/api/v5/market/index-candles?instId=${symbol}&bar=${interval}m&before=${firstTs}&after=${after}`
                );
                let data = res.data.data;
                if (!data.length) break;
                klines.push(...[...data].reverse());

                firstTs = Number(data[0][0]) + interval * 60 * 1000;
                console.log(new Date(firstTs).toISOString());
                if (savePath) {
                    ensureDirExists(savePath);
                    writeFileSync(savePath, JSON.stringify(klines));
                    console.log("Saved");
                }
                cnt += 1;
            }
        } else {
            const res = await axios.get(
                `https://okx.com/api/v5/market/index-candles?instId=${symbol}&bar=${interval}m&after=${
                    end ?? ""
                }&before=${start ?? ""}`
            ); //this.client.getIndexCandles(this.getSymbol(),`${this.bot.interval}m`, {after: `${end}`})
            let data = res.data.data;
            klines = [...data].reverse();
        }

        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }

    getSymbol() {
        return `${this.bot.base}-${this.bot.ccy}`;
    }
}
