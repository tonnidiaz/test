import { IBot } from "@cmn/models/bot";
import { getSymbol } from "@cmn/utils/functions";
import { botLog} from "@cmn/utils/bend/functions";
import { IOrderDetails, IOrderbook } from "@cmn/utils/interfaces";

export class Platform {
    name: string;
    bot: IBot;
    constructor(bot: IBot) {
        this.name = this.constructor.name;
        botLog(bot, `${this.name}: INIT, MODE = ${bot.demo ? "demo" : "live"}`);
        this.bot = bot;
    }
    async getOrderbook(symbol?: string) : Promise<IOrderbook | void | undefined | null> {
        symbol = symbol ?? this._getSymbol();
        botLog(this.bot, `[${this.name}] GETTING ORDERBOOK FOR ${symbol}...`)
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

        botLog(this.bot, `[${this.name}]: GETTING KLINES FOR ${symbol}...`);
    }

    _getPair() {
        return [this.bot.base, this.bot.ccy];
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
        botLog(this.bot, `[${this.name}]: CANCELLING ORDER...`);
    }

    async placeOrder(
        amt: number,
        price?: number,
        side: "buy" | "sell" = "buy",
        sl?: number,
        clOrderId?: string
    ): Promise<string | void | undefined | null> {
        const od = { price, sl, amt, side };
        botLog(this.bot, `[${this.name}]: PLACING ORDER`), { od };
    }

    async getOrderbyId(
        orderId: string,
        isAlgo = false,
        pair?: string[]
    ): Promise<IOrderDetails | null | "live" | undefined | void> {
        botLog(this.bot, `[${this.name}]: GETTING ORDER ${orderId}...`);
    }

    async getBal(ccy?: string): Promise<number | void | undefined | null> {
        botLog(this.bot, `[${this.name}]: GETTING BALANCE...`);
    }
}
