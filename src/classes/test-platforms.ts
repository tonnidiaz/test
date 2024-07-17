import { MAKER_FEE_RATE, TAKER_FEE_RATE, demo } from "@/utils/constants";
import { ensureDirExists } from "@/utils/orders/funcs";
import { getInterval, parseDate } from "@/utils/funcs2";
import { botLog } from "@/utils/functions";
import axios, { AxiosResponse } from "axios";
import crypto from "crypto"

import { writeFileSync } from "fs";
import {
    RestClientV5,
    KlineIntervalV3,
    APIResponseV3WithTime,
    CategorySymbolListV5,
    OHLCVKlineV5,
} from "bybit-api";
import { Candle, RestClient, Trade } from "okx-api";
import dotenv from "dotenv";
import { ITrade } from "@/utils/interfaces";

dotenv.config();

export class Platform {
    name: string = "";
    maker: number = MAKER_FEE_RATE;
    taker: number = TAKER_FEE_RATE;
    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
    }: {
        end?: number;
        start?: number;
        interval: number;
        symbol: string;
        savePath?: string;
    }): Promise<any[] | undefined> {
        return;
    }
    async getTrades({
        start,
        end,
        savePath,
        symbol,
    }: {
        end?: number;
        start?: number;
        symbol: string;
        savePath?: string;
    }): Promise<ITrade[] | undefined> {
        console.log(`\nGETTING TRADES FOR ${symbol}...\n`);
        if (savePath){ensureDirExists(savePath)}
        return;
    }
}

export class TestOKX extends Platform {
    name = "OKX";
    maker: number = 0.08 / 100;
    taker: number = 0.1 / 100;
    client: RestClient;
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;
    constructor() {
        super();
        this.flag = demo ? "1" : "0";
        this.apiKey = demo
            ? process.env.OKX_API_KEY_DEV!
            : process.env.OKX_API_KEY!;
        this.apiSecret = demo
            ? process.env.OKX_API_SECRET_DEV!
            : process.env.OKX_API_SECRET!;
        this.passphrase = process.env.OKX_PASSPHRASE!;

        this.client = new RestClient(
            {
                apiKey: this.apiKey,
                apiSecret: this.apiSecret,
                apiPass: this.passphrase,
            },
            demo ? "demo" : "prod"
        );
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
        const client = new RestClientV5();
        end = end ?? Date.now();
        let klines: any[] = [];
        let cnt = 0;
        console.log(
            `[ ${isBybit ? "ByBit" : this.name} ] \t GETTING KLINES.. FOR ` +
                symbol
        );

        if (start) {
            start =
                (isBybit ? start : start /* - interval * 60 * 1000 */) -
                20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
        }

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
                console.log("GETTING MARK PRICE");
                const res = isBybit
                    ? await client.getKline({
                          category: "spot",
                          symbol,
                          interval: interval as any,
                          start: firstTs,
                      })
                    : await this.client.getHistoricCandles(
                          symbol,
                          getInterval(interval, "okx"),
                          {
                              before: `${firstTs}`,
                              after: `${after}`,
                              limit: `${limit}`,
                          }
                      );
                const data = isBybit
                    ? (res as any).result.list
                    : (res as Candle[]);
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
            const res = await (isBybit
                ? client.getKline({
                      category: "spot",
                      symbol,
                      interval: interval as any,
                      start,
                      end,
                  })
                : this.client.getHistoricCandles(
                      symbol,
                      getInterval(interval, "okx"),
                      {
                          before: start ? `${start}` : undefined,
                          after: end ? `${end}` : undefined,
                      }
                  ));
            const data = isBybit ? (res as any).result.list : (res as Candle[]);
            klines = [...data].reverse();
        }

        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }
    async getTrades({
        start,
        end,
        savePath,
        symbol,
        isBybit,
    }: {
        end?: number | undefined;
        start?: number | undefined;
        symbol: string;
        savePath?: string | undefined;
        isBybit?: boolean;
    }) {
        try {
            const client = new RestClientV5();
            end = end ?? Date.now();
            let trades: any[] = [];
            let cnt = 0;
            const interval = 1 / 100;
            console.log(
                `[ ${
                    isBybit ? "ByBit" : this.name
                } ] \t GETTING TRADES.. FOR ` + symbol
            );

            if (start) {
                let endTs = end;
                console.log(endTs, end);
                while (endTs > start) {
                    console.log(`GETTING ${cnt + 1} TRADES...`);
                    const limit = 100;
                    //const after = firstTs + (limit - 1) * interval * 60 * 1000;
                    console.log(
                        `Before: ${parseDate(
                            new Date(start)
                        )} \t After: ${parseDate(new Date(endTs))}`
                    );
                    const res = await this.client.getHistoricTrades(symbol, {
                        //before: `${firstTs}`,
                        after: `${endTs}`,
                        limit: `${limit}`,
                        type: "2",
                    });
                    const data = isBybit
                        ? (res as any).result.list
                        : (res as Trade[]);
                        console.log(data);
                    if (!data.length) break;
                    trades = [...trades, ...data];

                    endTs = Number(data[data.length - 1].ts);
                    console.log("END_TS:");
                    console.log(new Date(endTs).toISOString());
                    if (savePath) {
                        ensureDirExists(savePath);
                        writeFileSync(savePath, JSON.stringify(trades));
                        console.log("Saved");
                    }
                    console.log(`DONE ${cnt}`);
                    cnt += 1;
                }
            }
            console.log("\nDONE GETTING ALL TRADES\n");
            let d = [...trades.reverse()];
            if (trades.length)
                console.log({
                    trades: {
                        ...trades[0],
                        ts: parseDate(new Date(Number(trades[0].ts))),
                    },
                });
            return d.sort((a, b) => Number(a.ts) - Number(b.ts));
        } catch (e) {
            console.log(e);
        }
    }
}

export class TestBybit extends Platform {
    client: RestClientV5;
    constructor() {
        super();
        const apiKey = demo
            ? process.env.BYBIT_API_KEY_DEV!
            : process.env.BYBIT_API_KEY!;
        const apiSecret = demo
            ? process.env.BYBIT_API_SECRET_DEV!
            : process.env.BYBIT_API_SECRET!;

        this.client = new RestClientV5({
            key: apiKey,
            secret: apiSecret,
            demoTrading: demo,
            //testnet: demo,
        });
    }
    name: string = "ByBit";
    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
    }: {
        end?: number | undefined;
        start?: number | undefined;
        interval: number;
        symbol: string;
        savePath?: string | undefined;
    }): Promise<any[] | undefined> {
        return await TestOKX.prototype.getKlines({
            start,
            end,
            savePath,
            interval,
            symbol,
            isBybit: true,
        });
    }
     createSignature(apiKey, apiSecret, params) {
        const paramString = Object.keys(params)
          .sort()
          .map(key => `${key}=${params[key]}`)
          .join('&');

          const timestamp = Date.now().toString()
        const prehashString = `${timestamp}${apiKey}${paramString}`;
        const signature =  crypto.createHmac('sha256', apiSecret).update(prehashString).digest('hex');
        const headers = {
            'X-BYBIT-API-KEY': apiKey,
            'X-BYBIT-SIGNATURE': signature,
            'X-BYBIT-TIMESTAMP': timestamp,
            'Content-Type': 'application/json'
          };
          return headers
      }
    async getTrades({
        start,
        end,
        savePath,
        symbol,
    }: {
        end?: number | undefined;
        start?: number | undefined;
        symbol: string;
        savePath?: string | undefined;
    }) {
        try {
            end = end ?? Date.now();
            let trades: any[] = [];
            let cnt = 0;
            const interval = 1 / 100;
            console.log(`[ ${this.name} ] \t GETTING TRADES.. FOR ` + symbol);
            console.log(symbol);
            if (start) {
                let endTs = end;
                console.log(endTs, start);
                while (endTs > start) {
                    console.log(`GETTING ${cnt + 1} TRADES...`);
                    const limit = 100;
                    //const after = firstTs + (limit - 1) * interval * 60 * 1000;
                    console.log(
                        `START: ${parseDate(
                            new Date(start)
                        )} \t END: ${parseDate(new Date(endTs))}`
                    );
                    const res = await this.client.getPublicTradingHistory({
                        
                        category: "spot",
                       symbol,
                        
                       limit:10,
                    });
                    if (res.retCode == 0){
                        console.log(res.result.list);
                    }else{
                        console.log(res);
                    }

                    const data = res.result.list;

                    if (!data.length) break;
                    trades = [...trades, ...data.map(el=>({ts: el.time, px: Number(el.price), sz: Number(el.price), side: el.side, symbol: el.symbol}))];

                    endTs = Number(data[data.length - 1].time);
                    console.log("START_TS:");
                    console.log(new Date(endTs).toISOString());
                    if (savePath) {
                        ensureDirExists(savePath);
                        writeFileSync(savePath, JSON.stringify(trades));
                        console.log("Saved");
                    }
                    console.log(`DONE ${cnt}`);
                    cnt += 1;
                }
            }
            console.log("\nDONE GETTING ALL TRADES\n");
            let d = [...trades.reverse()];
            if (trades.length)
                console.log({
                    trades: {
                        ...trades[0],
                        ts: parseDate(new Date(Number(trades[0].ts))),
                    },
                });
            return d.sort((a, b) => Number(a.ts) - Number(b.ts));
        } catch (e) {
            console.log(e);
        }
    }

    async getOBData() {
        //const res = await this.client.getOrderbook({symbol: 'ETHUSDT',})
    }
}
