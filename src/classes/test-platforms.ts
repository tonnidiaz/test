import { MAKER_FEE_RATE, TAKER_FEE_RATE, demo } from "@/utils/constants";
import { ensureDirExists } from "@/utils/orders/funcs";
import { getInterval, parseDate } from "@/utils/funcs2";
import { botLog } from "@/utils/functions";
import axios, { AxiosResponse } from "axios";
import { writeFileSync } from "fs";
import {
    RestClientV5,
    KlineIntervalV3,
    APIResponseV3WithTime,
    CategorySymbolListV5,
    OHLCVKlineV5,
} from "bybit-api";
import { Candle, RestClient } from "okx-api";
import dotenv from "dotenv";

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
                `[ ${
                    isBybit ? "ByBit" : this.name
                } ] \t GETTING KLINES.. FOR ` + symbol
            );

            if (start) {
                start =
                    (isBybit ? start : start - interval * 60 * 1000) -
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
                const data = isBybit
                    ? (res as any).result.list
                    : (res as Candle[]);
                klines = [...data].reverse();
            }

            let d = [...klines];
            console.log(d[d.length - 1]);
            return d;
        
    }
}

export class TestBybit extends Platform {
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

    async getOBData() {
        //const res = await this.client.getOrderbook({symbol: 'ETHUSDT',})
    }
}
