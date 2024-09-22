import { getInterval, parseDate } from "@/utils/funcs2";
import { ensureDirExists } from "@/utils/orders/funcs";
import { TestPlatform } from "./test-platforms";
import { RestClientV2 } from "bitget-api";
import { writeFileSync } from "fs";
import { CompanyResultSortBy } from "indicatorts";
import {
    existsSync,
    getSymbol,
    readJson,
    sleep,
    writeJson,
} from "@/utils/functions";
import { ICoinNets, IOrderbook, TPlatName } from "@/utils/interfaces";
import { safeJsonParse } from "@/utils/funcs3";
import { Axios } from "axios";

export class TestBitget extends TestPlatform {
    maker: number = 0.1 / 100;
    taker: number = 0.1 / 100;
    client: RestClientV2;
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;
    axiosClient: () => Axios;
    constructor({ demo = false }: { demo?: boolean }) {
        super({ demo, name: "bitget" });
        this.flag = demo ? "1" : "0";
        this.apiKey = demo
            ? process.env.BITGET_API_KEY_DEMO!
            : process.env.BITGET_API_KEY!;
        this.apiSecret = demo
            ? process.env.BITGET_API_SECRET_DEMO!
            : process.env.BITGET_API_SECRET!;
        this.passphrase = process.env.BITGET_PASSPHRASE!;

        this.client = new RestClientV2({});
        this.axiosClient = () =>
            new Axios({ baseURL: "https://api.kucoin.com/api" });
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
        console.log(
            `[ ${isBybit ? "ByBit" : this.name} ] \t GETTING KLINES.. FOR ` +
                symbol
        );

        if (start) {
            start =
                (isBybit ? start : start) /* - interval * 60 * 1000 */ -
                20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
        }

        if (start) {
            let firstTs = start;
            while (firstTs <= end) {
                console.log(`GETTING ${cnt + 1} KLINES...`);
                const limit = 200;
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(
                    `\nBefore: ${parseDate(
                        new Date(firstTs)
                    )} \t After: ${parseDate(new Date(after))}`
                );
                console.log("GETTING MARK PRICE");
                const res = await this.client.getSpotHistoricCandles({
                    symbol,
                    granularity: getInterval(interval, "bitget"),
                    endTime: Math.round(after),
                    limit: limit,
                });
                let { data } = res;
                if (!data || !data.length) return console.log(data);
                data = data.map((el) => el.map((el) => Number(el)));

                const last =
                    klines.length == 0
                        ? null
                        : Number(klines[klines.length - 1][0]);
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
                        console.log("LAST > NEW", data.length);
                    }
                    data = data.filter((el) => el[0] > last);
                    console.log(data.length);
                }
                if (!data?.length) break;

                klines.push(...[...data]);

                firstTs =
                    Number(data[data.length - 1][0]) + 2 * interval * 60 * 1000;

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
            const res = await this.client.getSpotHistoricCandles({
                symbol,
                granularity: getInterval(interval, "bitget"),
                endTime: end,
            });

            const { data } = res;
            klines = [...data];
        }

        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }

    async getTicker(pair: string[]): Promise<number> {
        super.getTicker(pair);
        try {
            const symbol = getSymbol(pair, "bitget");
            const r = await this.client.getSpotTicker({ symbol });
            return Number(r.data[0].lastPr);
        } catch (e) {
            this._log("FAILED TO GET TICKER", e);
            return 0;
        }
    }

    async getNets(ccy?: string, offline?: boolean) {
        super.getNets(ccy, offline)
        try {
            console.log({ offline });
            let res = safeJsonParse(
                offline && existsSync(this.netsPath)
                    ? await readJson(this.netsPath)
                    : (await this.axiosClient().get("/v3/currencies")).data
            );
            if (res.data) res = res.data;
            writeJson(
                this.netsPath,
                res.sort((a, b) => a.currency.localeCompare(b.currency))
            );

            const dummyData = [
                {
                    currency: "BTC",
                    name: "BTC",
                    fullName: "Bitcoin",
                    precision: 8,
                    confirms: null,
                    contractAddress: null,
                    isMarginEnabled: true,
                    isDebitEnabled: true,
                    chains: [
                        {
                            chainName: "BTC",
                            withdrawalMinFee: "0.001",
                            withdrawalMinSize: "0.0012",
                            withdrawFeeRate: "0",
                            depositMinSize: "0.0002",
                            isWithdrawEnabled: true,
                            isDepositEnabled: true,
                            preConfirms: 1,
                            contractAddress: "",
                            chainId: "btc",
                            confirms: 3,
                        },
                        {
                            chainName: "KCC",
                            withdrawalMinFee: "0.00002",
                            withdrawalMinSize: "0.0008",
                            withdrawFeeRate: "0",
                            depositMinSize: null,
                            isWithdrawEnabled: true,
                            isDepositEnabled: true,
                            preConfirms: 20,
                            contractAddress:
                                "0xfa93c12cd345c658bc4644d1d4e1b9615952258c",
                            chainId: "kcc",
                            confirms: 20,
                        },
                        {
                            chainName: "BTC-Segwit",
                            withdrawalMinFee: "0.0005",
                            withdrawalMinSize: "0.0008",
                            withdrawFeeRate: "0",
                            depositMinSize: "0.0002",
                            isWithdrawEnabled: false,
                            isDepositEnabled: true,
                            preConfirms: 2,
                            contractAddress: "",
                            chainId: "bech32",
                            confirms: 2,
                        },
                    ],
                },
            ];
            const data: typeof dummyData = res;

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
                        minDp: Number(el.depositMinSize),
                        maxDp: Infinity,
                        wdFee: Number(el.withdrawalMinFee),
                        wdFeeUSDT: Number(el.withdrawalMinFee) * ticker,
                        canDep: el.isDepositEnabled && el.isWithdrawEnabled,
                    })),
                };
            });

            return nets.filter((el) => !ccy || el.coin == ccy);
        } catch (e) {
            this._log("FAILED TO GET NETS", e);
        }
    }
    async getBook(
        pair: string[]
    ): Promise<IOrderbook | void | null | undefined> {
        const ts  = parseDate(new Date())
        try {
            super.getBook(pair);
            const r = await this.client.getSpotOrderBookDepth({symbol: this._getSymbo(pair),
                limit: 5,
            });
            const data = r.data

            if (r.code != "00000") return this._log(`FAILED TO GET BOOK FOR ${pair}`, data)

            const ob: IOrderbook = {
                ts,
                asks: data.asks.map((el) => ({
                    px: Number(el[0]),
                    amt: Number(el[1]),
                })),
                bids: data.bids.map((el) => ({
                    px: Number(el[0]),
                    amt: Number(el[1]),
                })),
            };
            return ob
        } catch (err) {
            this._log("FAILED TO GET BOOK FOR", pair);
            this._err(err)
        }
    }
}

/* 
{
  "code": "200000",
  "data": [
    {
      "currency": "BTC",
      "name": "BTC",
      "fullName": "Bitcoin",
      "precision": 8,
      "confirms": null,
      "contractAddress": null,
      "isMarginEnabled": true,
      "isDebitEnabled": true,
      "chains": [
        {
          "chainName" : "BTC",
          "withdrawalMinFee" : "0.001",
          "withdrawalMinSize" : "0.0012",
          "withdrawFeeRate" : "0",
          "depositMinSize" : "0.0002",
          "isWithdrawEnabled" : true,
          "isDepositEnabled" : true,
          "preConfirms" : 1,
          "contractAddress" : "",
          "chainId" : "btc",
          "confirms" : 3
        },
        {
          "chainName" : "KCC",
          "withdrawalMinFee" : "0.00002",
          "withdrawalMinSize" : "0.0008",
          "withdrawFeeRate" : "0",
          "depositMinSize" : null,
          "isWithdrawEnabled" : true,
          "isDepositEnabled" : true,
          "preConfirms" : 20,
          "contractAddress" : "0xfa93c12cd345c658bc4644d1d4e1b9615952258c",
          "chainId" : "kcc",
          "confirms" : 20
        },
        {
          "chainName" : "BTC-Segwit",
          "withdrawalMinFee" : "0.0005",
          "withdrawalMinSize" : "0.0008",
          "withdrawFeeRate" : "0",
          "depositMinSize" : "0.0002",
          "isWithdrawEnabled" : false,
          "isDepositEnabled" : true,
          "preConfirms" : 2,
          "contractAddress" : "",
          "chainId" : "bech32",
          "confirms" : 2
        }
      ]
    }
  ]
}
*/
 