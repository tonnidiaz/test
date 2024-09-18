import { getInterval, parseDate } from "@/utils/funcs2";
import { ensureDirExists } from "@/utils/orders/funcs";
import { TestPlatform } from "./test-platforms";
import { writeFileSync } from "fs";
import { CompanyResultSortBy } from "indicatorts";
import * as Mexc from "mexc-api-sdk";
import {
    botLog,
    existsSync,
    getSymbol,
    readJson,
    sleep,
    writeJson,
} from "@/utils/functions";
import { ICoinNets, IOrderbook, TPlatName } from "@/utils/interfaces";
import { netsRootDir } from "@/utils/consts2";
import { Axios } from "axios";
import { genSignature, safeJsonParse } from "@/utils/funcs3";

export class TestMexc extends TestPlatform {
    maker: number = 0.1 / 100;
    taker: number = 0.1 / 100;
    client: Mexc.Spot;
    apiKey: string;
    apiSecret: string;
    passphrase: string;
    axiosClient: () => Axios;

    constructor({ demo = false }: { demo?: boolean }) {
        super({ demo, name: "mexc" });
        this.apiKey = process.env.MEXC_API_KEY!;
        this.apiSecret = process.env.MEXC_API_SECRET!;
        this.passphrase = process.env.MEXC_PASSPHRASE!;
        this.client = new Mexc.Spot();

        this.axiosClient = () => {
            const ts = Date.now().toString();
            return new Axios({
                baseURL: "https://api.mexc.com/api/v3",
                headers: {
                    "X-MEXC-APIKEY": this.apiKey,
                    "Content-Type": "application/json",
                },
                params: {
                    signature: genSignature(
                        this.apiKey,
                        this.apiSecret,
                        { timestamp: ts },
                        this.name!
                    ),
                    timestamp: ts,
                },
            });
        };
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
        console.log({ client: "client", demo: this.demo }, "\n");
        end = end ?? Date.now() - interval * 60000;

        const END = end;
        const diff = (10000 - 30) * interval * 60000;
        const MIN_DATE = end - diff;

        if (start && start < MIN_DATE) {
            //start = MIN_DATE;
            //end = start + diff
        }
        if (end && end > Date.now()) {
            //end = Date.now();
        }
        console.log({
            MIN_DATE: parseDate(new Date(MIN_DATE)),
            START: parseDate(new Date(start ?? 0)),
        });

        let klines: any[] = [];
        let done = false;
        let cnt = 0;
        console.log(` GETTING KLINES.. FOR ` + symbol);

        if (start) {
            start =
                (isBybit ? start : start) /* - interval * 60 * 1000 */ -
                20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
        }

        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                console.log(`MEXC GETTING ${cnt + 1} KLINES...`);
                const limit = 1000;
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(
                    `\nBefore: ${parseDate(
                        new Date(firstTs)
                    )} \t After: ${parseDate(new Date(after))}`
                );
                console.log("GETTING MARK PRICE");
                const res = await this.client.klines(
                    symbol,
                    getInterval(interval, "mexc"),
                    {
                        startTime: firstTs,
                        endTime: Math.round(after),
                        limit: limit,
                    }
                );
                let data = res;
                if (!data || !data.length) {
                    console.log(data);
                    if (data) break;
                    return;
                }
                data = data.map((el) => el.map((el) => Number(el)));

                const last =
                    klines.length != 0 && Number(klines[klines.length - 1][0]);
                const _new = Number(data[0][0]);
                console.log(
                    "\n",
                    {
                        last:
                            last &&
                            parseDate(new Date(klines[klines.length - 1][0])),
                        new: parseDate(new Date(data[0][0])),
                    },
                    "\n"
                );

                if (last) {
                    if (last >= _new) {
                        console.log("LAST > NEW");
                    }
                    data = data.filter((el) => el[0] > last);
                }
                if (!data?.length) break;

                klines.push(...[...data]);

                firstTs =
                    Number(data[data.length - 1][0]) + 1 * interval * 60 * 1000;

                console.log(new Date(firstTs).toISOString());
                if (savePath) {
                    ensureDirExists(savePath);
                    writeFileSync(savePath, JSON.stringify(klines));
                    console.log("Saved");
                }

                if (done) {
                    break;
                }
                cnt += 1;
            }
        } else {
            const res = await this.client.klines(
                symbol,
                getInterval(interval, "mexc"),
                { endTime: end, startTime: start }
            );

            const data = res;
            klines = [...data];
        }

        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }
    async getTicker(pair: string[]): Promise<number> {
        super.getTicker(pair);
        try {
            const symbol = getSymbol(pair, "mexc");
            const r = await this.client.tickerPrice(symbol);
            if (!r.price) {
                this._log("FAILED TO GET TICKER", r);
                return 0;
            }
            return Number(r.price);
        } catch (e) {
            this._log("FAILED TO GET TICKER", e);
            return 0;
        }
    }

    async getNets(ccy?: string, offline?: boolean) {
        try {
            console.log({ offline });
            const res = safeJsonParse(
                offline && existsSync(this.netsPath)
                    ? await readJson(this.netsPath)
                    : (await this.axiosClient().get("/capital/config/getall"))
                          .data
            );

            writeJson(
                this.netsPath,
                res.sort((a, b) => a.coin.localeCompare(b.coin))
            );
            const data = res;

            let coins: string[] = Array.from(
                new Set(data.map((el) => el.coin))
            );

            coins = coins.sort((a, b) => a.localeCompare(b));

            const tickers =
                offline && existsSync(this.tickersPath)
                    ? await readJson(this.tickersPath)
                    : await Promise.all(
                          coins.map(async (el) => {
                              let ticker = 0;
                              if (el == "USDT" || el == "USDC" || true) {
                                  ticker = 1;
                              } else {
                                  try {
                                      ticker = await this.getTicker([
                                          el,
                                          "USDT",
                                      ]);
                                      await sleep(100);
                                  } catch (e) {
                                      console.log(e);
                                  }
                              }
                              return { coin: el, ticker };
                          })
                      );
            writeJson(this.tickersPath, tickers);
            const nets: ICoinNets[] = coins.map((el) => {
                const net = data.find((el2) => el2.coin == el);
                const ticker = tickers.find((el2) => el2.coin == el)!.ticker;
                return {
                    coin: net.coin,
                    name: net.name,
                    ticker,
                    nets: res
                        .find((el2) => {
                            return el2.coin == el;
                        })!
                        .networkList.map((el) => ({
                            name: el.name,
                            coin: el.coin,
                            chain: el.network,
                            contactAddr: el.contract,
                            minComfirm: Number(el.minConfirm),
                            minWd: Number(el.withdrawMin),
                            maxWd: Number(el.withdrawMax),
                            minDp: 0,
                            maxDp: Infinity,
                            dpTip: el.depositTips,
                            wdTip: el.withdrawTips,
                            wdFee: Number(el.withdrawFee),
                            wdFeeUSDT: Number(el.withdrawFee) * ticker,
                            canDep: el.depositEnable,
                        })),
                };
            });

            return nets.filter((el) => !ccy || el.coin == ccy);
        } catch (e) {
            this._log("FAILED TO GET NETS", e);
        }
    }
    async testAxios() {
        try {
            return console.log(this.name);
            const r = await this.axiosClient().get("/capital/config/getall");
            console.log(r.data);
        } catch (err) {
            console.log(err);
        }
    }

    async getBook(
        pair: string[]
    ): Promise<IOrderbook | void | null | undefined> {
        try {
            super.getBook(pair);
            const r = await this.client.depth(this._getSymbo(pair), {
                limit: 5,
            });
            const ob: IOrderbook = {
                ts: parseDate(r.timestamp),
                asks: r.asks.map((el) => ({
                    px: Number(el[0]),
                    amt: Number(el[1]),
                })),
                bids: r.bids.map((el) => ({
                    px: Number(el[0]),
                    amt: Number(el[1]),
                })),
            };
            return ob
        } catch (err) {
            this._log("FAILED TO GET BOOK FOR", pair, err);
        }
    }
}
