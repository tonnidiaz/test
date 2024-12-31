import { IBot } from "@cmn/models/bot";
import { getSymbol } from "@cmn/utils/functions";
import { botLog} from "@cmn/utils/bend/functions";
import { IOrderDetails, IOrderbook } from "@cmn/utils/interfaces";

export class Platform {
    name: string;
    bot: IBot;
    pair: string[]
    constructor(bot: IBot, pair?: string[]) {
        this.name = this.constructor.name;
        this.bot = bot;
        this.pair = pair || [bot.base, bot.ccy]
        botLog(bot, `${this.name}: INIT, MODE = ${bot.demo ? "demo" : "live"}`);
        
        botLog(bot, `[${this.name}] Initializer: ${pair}`)
    }
    async getOrderbook(symbol?: string) : Promise<IOrderbook | void | undefined | null> {
        symbol = symbol ?? this._getSymbol();
        this.log( `[${this.name}] GETTING ORDERBOOK FOR ${symbol}...`)
    }
    async getKlines({
        start,
        end,
        interval,
        pair,
        limit,
    }: {
        end?: number;
        start?: number;
        interval?: number;
        pair?: string[];
        limit?: number;
    }): Promise<any[][] | undefined | null | void> {
        pair = pair ?? this._getPair();
        const symbol = getSymbol(pair, this.bot.platform);

        this.log( `GETTING KLINES FOR ${symbol}...`);
    }

    _getPair() {
        return this.pair;
    }
    _getSymbol() {
        return getSymbol(this._getPair(), this.bot.platform);
    }

    async cancelOrder({
        ordId,
        isAlgo,
    }: {
        ordId: string;
        isAlgo?: boolean;
    }): Promise<string | undefined | null | void> {
        this.log( `CANCELLING ORDER ${ordId}...`);
    }

    async placeOrder({amt, price, side = "buy", sl, clOrderId, useBaseCcy}:
        {amt: number,
        price?: number,
        side?: "buy" | "sell" ,
        sl?: number,
        clOrderId?: string,
        useBaseCcy?: boolean}
    ): Promise<string | void | undefined | null> {
        const od = { price, sl, amt, side, useBaseCcy };
        this.log( `PLACING ORDER FOR [${this.pair}]`), { od };
    }

    async getOrderbyId(
        orderId: string,
        isAlgo = false,
        pair?: string[]
    ): Promise<IOrderDetails | null | "live" | undefined | void> {
        this.log( `GETTING ORDER ${orderId}...`);
    }

    async getBal(ccy?: string): Promise<number | void | undefined | null> {
        this.log( `GETTING BALANCE...`);
    }
    async withdraw({amt, coin, chain, addr, memo}: {amt: number; coin: string; chain: string; addr: string; memo?: string}) : Promise<string | null | void | undefined>{
        this.log( `WITHDRAWING ${coin} through ${chain}`);
    }

    log(...args: any[] ){
        botLog(this.bot, `[${this.name}]: [${this.pair}]`, ...args)
    }
}
