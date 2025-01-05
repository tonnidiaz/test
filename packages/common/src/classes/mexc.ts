import { IBot } from "@cmn/models/bot";
import { getInterval, parseFilledOrder } from "@cmn/utils/funcs2";
import {  getSymbol, handleErrs } from "@cmn/utils/functions";
import { DEV, MEXC_API_ROOT_URL } from "@cmn/utils/constants";
import { botLog } from "@cmn/utils/bend/functions";
import { parseDate } from "@cmn/utils/functions";
import { IObj, IOrderDetails } from "@cmn/utils/interfaces";
import Mexc2 from "node-mexc-apis";
import { Platform } from "./platforms";
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import crypto from "crypto"

type TSpot = typeof Mexc2.prototype.spot;

const genSignature = (params: IObj, secret: string) => {
    const _params = {};
    for (let k of Object.keys(params).sort()) {
        const v = params[k];
        if (!v) continue;
        _params[k] = v;
    }

    const prehashString = new URLSearchParams(_params).toString();
    console.log({ prehashString });
    const signature = crypto
        .createHmac("sha256", secret)
        .update(prehashString)
        .digest("hex");
    return signature;
};

export class Mexc extends Platform {
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    // client: Spot;
    client2: TSpot;
    axiosClient:  AxiosInstance;
    constructor(bot: IBot, pair?: string[]) {
        super(bot, pair);
        this.apiKey = process.env.MEXC_API_KEY!;
        this.apiSecret = process.env.MEXC_API_SECRET!;
        this.passphrase = process.env.MEXC_PASSPHRASE!;

        // this.client = new Mexc2(this.apiKey, this.apiSecret);
        
        this.client2 = new ((Mexc2 as any).default || Mexc2)({
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
        }).spot;
        
        this.axiosClient = axios.create({baseURL: MEXC_API_ROOT_URL, headers: {
            "Content-Type": "application/json",
            "X-MEXC-APIKEY": this.apiKey
        }});
        this.axiosClient.interceptors.request.use((config) => {
            const timestamp = Date.now();
            let params = config.params || {};
        
             params.timestamp = timestamp;
            const signature = genSignature(params, this.apiSecret).toLowerCase()
           
            params = {...params, signature};
            config.params = params;
            return config;
        });
    }


    async getBal(ccy?: string) {
        botLog(this.bot, "GETTING BAL...");
        try {
            const res = await this.client2.accountInformation();
            if (!res.canTrade) {
                console.log(res);
                return;
            }
            return Number(
                res.balances.find((el) => el.asset == ccy || this.bot.ccy)
                    ?.free ?? 0
            );
        } catch (error) {
            console.log(error);
        }
    }
    async placeOrder({ amt, price, side, sl, clOrderId, useBaseCcy }: { amt: number; price?: number; side?: "buy" | "sell"; sl?: number; clOrderId?: string; useBaseCcy: boolean; }): Promise<string | void | undefined | null> {

        await super.placeOrder({amt, price, side, sl, clOrderId, useBaseCcy});
        try {

            const is_market = price == undefined;
            const res = await this.client2.placeOrder(
               {symbol: this.getSymbol(),
                trade_type: side.toUpperCase(),
                // (
                
                    quantity: !is_market ? amt.toString() : undefined,
                    // : is_market ? amt.toString() : undefined,
                    price: price?.toString(),
                    client_order_id: clOrderId,
                    order_type: (is_market ? "Market" : "Limit").toUpperCase(),
                }
            );
            if (!res.orderId) {
                console.log(res);
                return;
            }
            console.log(`\ORDER PLACED FOR BOT=${this.bot.name}\n`);

            return res.orderId;
        } catch (error: any) {
            //[ 'statusCode', 'headers', 'body', 'url' ]
            this._parseErr(error);
        }
    }

    _parseErr(error: any) {
        error = error?.body ? JSON.parse(error.body) : error;
        console.log(error.msg);
    }
    async getOrderbyId(orderId: string, isAlgo = false) {
        try {
            let data: IOrderDetails | null = null;

            botLog(this.bot, "GETTING ORDER...");
            const res = await this.client2.queryOrder({symbol: this.getSymbol(), 
                orderId,
            });

            if (!res.symbol) {
                console.log(res);
                return;
            }

            const d = res;

            if (DEV) console.log(d);
            if (res.status.toLowerCase() != "filled") {
                botLog(this.bot, "Order not yet filled");
                return "live";
            }

            data = parseFilledOrder(d, this.bot.platform);
            return data;
        } catch (error) {
            this._parseErr(error);
        }
    }
    async getTicker() {
        try {
            botLog(this.bot, "GETTING TICKER...");
            const res = await this.client2.ticker({symbol: this.getSymbol()});
            const ticker = Number(res.price);
            console.log({ ticker });
            return ticker;
        } catch (e) {
            this._parseErr(e);
        }
    }
    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
        limit = 500,
    }: {
        end?: number;
        start?: number;
        interval?: number;
        symbol?: string;
        savePath?: string;
        limit?: number;
    }) {
        try {
            if (end) {
                console.log("HAS END", parseDate(new Date(end)));
            }
            interval = interval ?? this.bot.interval;
            end = end ?? Date.now() - 2 * interval * 60000;
            let klines: any[] = [];
            let cnt = 0;

            symbol = symbol ?? this.getSymbol();

            end += interval * 60000;
            const res = await this.client2.kline(
                {symbol: this.getSymbol(),
                interval: getInterval(interval, "mexc"),}
                
            );

            const data = res;
            klines = [...data];

            const d = [...klines]; //.reverse()
            return limit == 1 ? d[d.length - 1] : d;
        } catch (e: any) {
            return this._parseErr(e);
        }
    }

    async getKline() {
        const end = Date.now();
        return await this.getKlines({ end, limit: 1 });
    }

    getSymbol() {
        return getSymbol(this.pair, "mexc");
    }
    async cancelOrder({ ordId }: { ordId: string }) {
        try {
            const res = await this.client2.cancelOrder({symbol: this.getSymbol(), 
                orderId: ordId,
            });
            if (!res.symbol) {
                botLog(this.bot, "FAILED TO CANCEL ORDER");
                console.log(res);
                return;
            }
            return res.orderId;
        } catch (error) {
            this._parseErr(error);
        }
    }

    async withdraw({amt, coin, chain, addr, memo}: {amt: number; coin: string; chain: string; addr: string; memo?: string}){
        let r: AxiosResponse<any, any> | undefined;
        try{
            /* 
            {
  coin: 'KARATE',
  network: 'Hedera(HBAR)',
  address: '0.0.858938',
  memo: '140968',
  chainName: null,
  chainDisplayName: null,
  netWork: null
}
            */
            console.log(this.axiosClient.defaults.params);
            const params = { address: addr, amount: amt.toString(), coin, netWork: chain, }
             r = await this.axiosClient.post("/capital/withdraw", undefined, {params})
            // r = await this.axiosClient.post("/capital/deposit/address", undefined, {params: {
            //     coin: "KARATE", network: "Hedera(HBAR)"
            // }})
            console.log(r.data);
            return r.data.id
            
        }
        catch(e){
            
            this.log(`Failed to withdraw ${amt} of ${coin} through ${chain}`)
            // console.log(e);

            handleErrs(e)
        }
    }

   
}
