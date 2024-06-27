import { MAKER_FEE_RATE, TAKER_FEE_RATE, demo } from "@/utils/constants";
import { ensureDirExists } from "@/utils/orders/funcs";
import { getInterval, parseDate } from "@/utils/funcs2";
import { botLog } from "@/utils/functions";
import axios, { AxiosResponse } from "axios";
import { writeFileSync } from "fs";
import {RestClientV5, KlineIntervalV3, APIResponseV3WithTime, CategorySymbolListV5, OHLCVKlineV5} from 'bybit-api'
import { Candle, RestClient } from "okx-api";
import dotenv from 'dotenv'

dotenv.config()

export class Platform {
    name: string = "";
    maker: number = MAKER_FEE_RATE
    taker: number = TAKER_FEE_RATE
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
    maker: number = .08 / 100;
    taker: number = .1 / 100;
    client: RestClient;
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;
    constructor(){
        super()
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
        const rootURL = `https://okx.com/api/v5/market/history-candles`
        const client = new RestClientV5()
            end = end ?? Date.now();
            let klines: any[] = [];
            let cnt = 0;
            console.log(`[ ${isBybit ? 'ByBit' : this.name } ] \t GETTING KLINES.. FOR ` + symbol);

            if (start) {
                let firstTs = isBybit ? start : start - interval * 60 * 1000; /* ACCORDING TO RETURNED DATA */
                firstTs -= 20 * interval * 60000
                while (firstTs <= end) {
                    console.log(`GETTING ${cnt + 1} KLINES...`);
                    const limit = 100;
                    const after = firstTs + (limit - 1) * interval * 60 * 1000;
                    console.log(
                        `Before: ${parseDate(
                            new Date(firstTs)
                        )} \t After: ${parseDate(new Date(after))}`
                    );
                    const url =  //`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&start=${firstTs}`
                     `${rootURL}?instId=${symbol}&bar=${getInterval(interval, 'okx')}&before=${firstTs}&after=${after}&limit=${limit}`;
                    console.log('GETTING MARK PRICE');
                    const res = isBybit ? await client.getKline({category: 'spot', symbol,interval: interval as any, start: firstTs}): await this.client.getHistoricCandles(symbol, getInterval(interval, 'okx'), {
                        before: `${firstTs}`,
                        after: `${after}`,
                        limit: `${limit}`,
                    }) //await axios.get(url);
                    const data = isBybit ? (res as any ).result.list: (res as Candle[]);
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
                const url = isBybit
                    ? `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&start=${start}&end=${end}`
                    : `${rootURL}?instId=${symbol}&bar=${getInterval(interval, 'okx')}&after=${
                          end ?? ""
                      }&before=${start ?? ""}`;

                const res = await axios.get(url); //this.client.getIndexCandles(this.getSymbol(),`${interval}m`, {after: `${end}`})
                const data = isBybit ? res.data.result.list : res.data.data;
                klines = [...data].reverse();
            }

            let d = [...klines];
            console.log(d[d.length - 1]);
            return d;
    
    }
}

export class TestBybit extends Platform {
    name: string = "ByBit";
    client: RestClientV5;

    constructor(){
        super()
        this.client = new RestClientV5()
    }
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
        return await TestOKX.prototype.getKlines({start, end, savePath, interval, symbol, isBybit: true})
    }

    async getOBData(){
        //const res = await this.client.getOrderbook({symbol: 'ETHUSDT',})
    }
}
