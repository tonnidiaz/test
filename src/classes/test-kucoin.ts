import { TestPlatform } from "./test-platforms";
import { SpotClient } from "kucoin-api";
import type { CurrencyInfo, Kline } from "kucoin-api";
import { MAKER_FEE_RATE, TAKER_FEE_RATE } from "@/utils/constants";
import { ensureDirExists } from "@/utils/orders/funcs";
import { getInterval, parseDate } from "@/utils/funcs2";
import { botLog, getSymbol, readJson, sleep, writeJson } from "@/utils/functions";
import axios, { AxiosResponse } from "axios";
import { existsSync, writeFileSync } from "fs";
import { ICoinNets, IOrderbook, TPlatName } from "@/utils/interfaces";
import { safeJsonParse } from "@/utils/funcs3";

export class TestKucoin extends TestPlatform {
    maker: number = 0.1 / 100;
    taker: number = 0.1 / 100;
    client: SpotClient;
    constructor({ demo = false }: { demo?: boolean; }) {
        super({ demo, name: 'kucoin' });
        this.client = new SpotClient();
    }
    _parseData(data: Kline[]) {
        /**
              *  0 - ts in secs
                 1 - Open
                 2 - Close
                 3 - Highest price
                 4 - Lowest price
                 5 - Trading volume in base currency
              */
        return data.map((el) => {
            return [el[0], el[1], el[3], el[4], el[2], el[5]].map((el2, i) =>
                i == 0 ? Number(el2) * 1000 : Number(el2)
            );
        });
    }

    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
    }: {
        end?: number | undefined;
        start: number;
        interval: number;
        symbol: string;
        savePath?: string | undefined;
    }) {
        await super.getKlines({ start, end, savePath, symbol, interval });
        try {
            end = end ?? Date.now();
            let cnt = 0;

            const klines: number[][] = [];
            let firstTs = start;
            const limit = 1500;
            while (firstTs <= end) {
                cnt++;
                let after = firstTs + limit * interval * 60000;
                const res = await this.client.getKlines({
                    symbol,
                    type: getInterval(interval, "kucoin"),
                    endAt: Math.round(after / 1000),
                    startAt: Math.round(firstTs / 1000),
                });
                if (res.code != "200000") {
                    return console.log(res);
                }
                const data = this._parseData(res.data);
                if (!data.length) break
                klines.push(...[...data].reverse());
                firstTs = data[0][0] + interval * 60000;
                if (savePath) {
                    ensureDirExists(savePath);
                    writeFileSync(savePath, JSON.stringify(klines));
                    console.log("Klines saved!!");
                }
                console.log(
                    {
                        len: res.data.length,
                        first: parseDate(data[0][0]),
                        last: parseDate(data[data.length - 1][0]),
                    },
                    "\n"
                );
            }

            //let d = [...klines];
            //console.log(d[d.length - 1]);
            return klines;
        } catch (e) {
            console.log(e);
        }
    }

    async getTicker(pair: string[]): Promise<number> {
        super.getTicker(pair)
        try{
            const symbol = getSymbol(pair, 'kucoin')
            const r = await this.client.getTicker({symbol})
            return Number(r.data.price)
        }
        catch(e){
            this._log("FAILED TO GET TICKER", e)
            return 0
        }
    }
    async getBook(
        pair: string[]
    ): Promise<IOrderbook | void | null | undefined> {
        const ts  = parseDate(new Date())
        try {
            super.getBook(pair);
            const r = await this.client.getOrderBookLevel20({symbol: this._getSymbo(pair),
            });
            const data = r.data

            if (r.code != "200000") return this._log(`FAILED TO GET BOOK FOR ${pair}`, data)

            const ob: IOrderbook = {
                ts,
                asks: data.asks.slice(0, 5).map((el) => ({
                    px: Number(el[0]),
                    amt: Number(el[1]),
                })),
                bids: data.bids.slice(0, 5).map((el) => ({
                    px: Number(el[0]),
                    amt: Number(el[1]),
                })),
            };
            return ob
        } catch (err) {
            this._log("FAILED TO GET BOOK FOR", pair, err);
        }
    }

    async getNets(coin?: string, offline?: boolean): Promise<ICoinNets[] | void | null | undefined> {
        super.getNets(coin, offline)
        try {
            console.log({ offline });
            let res = safeJsonParse(
                offline && existsSync(this.netsPath)
                    ? await readJson(this.netsPath)
                    : (await this.client.getCurrencies()));

            if (res.code && res.code != "200000") return this._log(`FAILED TO GET NETS`, res)
            if (res.data) res = res.data;
            writeJson(
                this.netsPath,
                res.sort((a, b) => a.currency.localeCompare(b.currency))
            );

            
            const data: CurrencyInfo[] = res;

            let coins: string[] = Array.from(
                new Set(data.map((el) => el.currency))
            );

            coins = coins
                .filter((el) => data.find((el2) => el2.currency == el)?.chains)
                .sort((a, b) => a.localeCompare(b));

            const tickers: { coin: string; ticker: number }[] = [];

            if (offline && existsSync(this.tickersPath))
                tickers.push(...(await readJson(this.tickersPath)));
            else {
                for (let el of coins) {
                    let ticker = 0;
                    if (el == "USDT" || el == "USDC" || true) {
                        ticker = 1;
                    } else {
                        try {
                            ticker = await this.getTicker([el, "USDT"]);

                            await sleep(100);
                        } catch (e) {
                            console.log(e);
                        }
                    }
                    tickers.push({coin: el, ticker})
                    writeJson(this.tickersPath, tickers)
                }
            }

            writeJson(this.tickersPath, tickers);
            const nets: ICoinNets[] = coins.map((el) => {
                const net = data.find((el2) => el2.currency == el);
                const ticker = tickers.find((el2) => el2.coin == el)!.ticker;
                return {
                    coin: net!.currency,
                    name: net!.fullName,
                    ticker,
                    nets: net!.chains.map((el) => ({
                        name: el.chainName,
                        coin: net!.currency,
                        chain: el.chainName,
                        contactAddr: el.contractAddress,
                        minComfirm: Number(el.confirms),
                        minWd: Number(el.withdrawalMinSize),
                        maxWd: Infinity,
                        minDp: Number(0),
                        maxDp: Infinity,
                        wdFee: Number(el.withdrawalMinFee),
                        wdFeeUSDT: Number(el.withdrawalMinFee) * ticker,
                        canDep: el.isDepositEnabled && el.isWithdrawEnabled,
                    })),
                };
            });

            return nets.filter((el) => !coin || el.coin == coin);
        } catch (e) {
            this._log("FAILED TO GET NETS", e);
        }
    }
}
