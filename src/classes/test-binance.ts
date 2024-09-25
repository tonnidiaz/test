import { data } from "@/data/data";
import { ensureDirExists } from "@/utils/orders/funcs";
import { parseDate } from "@/utils/funcs2";
import axios, { Axios } from "axios";
import { unlinkSync, writeFileSync } from "fs";
import { TestPlatform } from "./test-platforms";
import { ICoinNets, IOrderbook, ITrade } from "@/utils/interfaces";
import { MainClient } from "binance";

import {
    existsSync,
    getSymbol,
    readJson,
    sleep,
    writeJson,
} from "@/utils/functions";
import type { AssetDetail, SymbolPrice } from "binance";
import { genSignature, safeJsonParse } from "@/utils/funcs3";
import { configDotenv } from "dotenv";
import Binance from 'binance-api-node'
import type {CoinInformation} from 'binance-api-node'

configDotenv()
export class TestBinance extends TestPlatform {
    client: MainClient;
    client2:  ReturnType<typeof Binance>
    axiosClient: () => Axios;
    constructor({ demo = false }: { demo?: boolean }) {
        super({ demo, name: "binance" });
        const apiKey = process.env.BINANCE_API_KEY!;
        const apiSecret = process.env.BINANCE_API_SECRET!;
        console.log(apiKey, apiSecret)
        this.client = new MainClient({
           
        });

        this.client2 =  Binance({apiKey, apiSecret})

        this.axiosClient = () => {
            const ts = Date.now().toString();
            return new Axios({
                baseURL: "https://api.binance.com",
                headers: {
                    "X-MBX-APIKEY": apiKey,
                    "Content-Type": "application/json",
                },
                params: {
                    signature: genSignature(
                        apiKey,
                        apiSecret,
                        { timestamp: ts, key: apiKey },
                        this.name!
                    ),
                    key: apiKey,
                    timestamp: ts,
                },
            });
        };
    }
    async getKlines({
        symbol,
        start,
        end,
        interval = 15,
        savePath,
    }: {
        symbol?: string;
        start?: number;
        end?: number;
        interval: number;
        savePath?: string;
    }) {
        try {
            if (savePath) {
                //console.log("DELETING PREVIOUS DATA...");
                try {
                    //unlinkSync(savePath);
                } catch (e) {
                    console.log("ERROR REMOVING FILE");
                }
            }
            let cnt = 0;
            let klines: [][] = [];
            symbol = (symbol ?? data.symbol).replaceAll("-", "");
            interval = interval ?? data.interval;
            ///if (start) start -= 10 * interval * 60 * 1000;
            end = end ?? Date.now();
            const parsedInterval =
                interval < 60
                    ? `${interval}m`
                    : `${Math.round(interval / 60)}h`;

            if (start) {
                let firstTs = start;
                while (firstTs <= end) {
                    console.log(`[Binance] GETTING ${cnt + 1} KLINES...`);
                    console.log(parseDate(new Date(firstTs)));
                    const res = await axios.get(
                        `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${parsedInterval}&startTime=${firstTs}`
                    );
                    const data = res.data;
                    klines.push(...data);

                    if (data.length == 0) break;

                    firstTs = data[data.length - 1][6];
                    if (savePath) {
                        writeFileSync(savePath, JSON.stringify(klines));
                        console.log("SAVED");
                    }
                    cnt += 1;
                }
            } else {
                const res = await axios.get(
                    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${parsedInterval}&endTime=${end}`
                );
                klines = res.data;
            }
            if (savePath) {
                ensureDirExists(savePath);
                writeFileSync(savePath, JSON.stringify(klines));
                console.log("Final Klines Saved");
            }
            console.log(klines.length);
            console.log("DONE FETCHING KLINES");
            return klines;
        } catch (err) {
            console.log("FAILED TO GET KLINES", err);
        }
    }
    async getTrades({
        start,
        end,
        savePath,
        symbol,
    }: {
        end?: number | undefined;
        start: number;
        symbol: string;
        savePath?: string | undefined;
    }) {
        super.getTrades({ start, end, savePath, symbol });
        try {
            end = end ?? Date.now();
            let trades: ITrade[] = [];
            let res: any[] = [];
            let cnt = 0;

            if (savePath) {
                console.log("DELETING PREVIOUS DATA...");
                try {
                    unlinkSync(savePath);
                } catch (e) {
                    console.log("ERROR REMOVING FILE");
                }
            }
            if (start) {
                let firstTs = start;
                while (firstTs <= end) {
                    console.log(`[Binance] GETTING ${cnt + 1} TRADES...`);
                    console.log(parseDate(new Date(firstTs)));
                    res = await this.client.getRecentTrades({
                        symbol,
                    });
                    const _res = res.map((el) => ({
                        symbol,
                        sz: Number(el.q),
                        px: Number(el.p),
                        ts: parseDate(new Date(Number(el.T))),
                    }));
                    trades.push(..._res);

                    if (res.length == 0) break;

                    firstTs = Number(res[res.length - 1].T);
                    if (savePath) {
                        writeFileSync(savePath, JSON.stringify(trades));
                        console.log("SAVED\n");
                    }
                    cnt += 1;
                }
            } else {
                res = await this.client.getRecentTrades({
                    symbol,
                    //endTime: end,
                });
                trades = res.map((el) => ({
                    symbol,
                    sz: Number(el.q),
                    px: Number(el.p),
                    ts: parseDate(new Date(Number(el.T))),
                }));
            }

            return trades;
        } catch (error) {
            console.log(error);
            return [];
        }
    }
    async getTicker(pair: string[]): Promise<number> {
        try {
            const ticker = await this.client.getSymbolPriceTicker({
                symbol: getSymbol(pair, "binance"),
            });
            return Number((ticker as SymbolPrice).price);
        } catch (e) {
            this._log("FAILED TO GET TICKER FOR", pair, e);
            return 0;
        }
    }
    async getBook(
        pair: string[]
    ): Promise<IOrderbook | void | null | undefined> {
        super.getBook(pair);
        try {
            const ts = parseDate(new Date());
            const r = await this.client.getOrderBook({
                symbol: this._getSymbo(pair),
                limit: 5,
            });
            const ob: IOrderbook = {
                ts,
                asks: r.asks.map((el) => ({
                    px: Number(el[0]),
                    amt: Number(el[1]),
                })) as any,
                bids: r.bids.map((el) => ({
                    px: Number(el[0]),
                    amt: Number(el[1]),
                })) as any,
            };

            return ob;
        } catch (e) {
            this._log("FAILED TO GET ORDERBOOK FOR", pair);
            this._err(e)
        }
    }

    async getNets(
        ccy?: string,
        offline?: boolean
    ): Promise<ICoinNets[] | void | null | undefined> {
        try {
            super.getNets(ccy, offline);
            const res = safeJsonParse(
                offline && existsSync(this.netsPath)
                    ? await readJson(this.netsPath)
                    : await this.client2.capitalConfigs()
            );

            writeJson(
                this.netsPath,
                res.sort((a, b) => a.coin.localeCompare(b.coin))
            );

            const dummyData = [
                {
                    coin: "BTC",
                    depositAllEnable: true,
                    free: "0.08074558",
                    freeze: "0.00000000",
                    ipoable: "0.00000000",
                    ipoing: "0.00000000",
                    isLegalMoney: false,
                    locked: "0.00000000",
                    name: "Bitcoin",
                    networkList: [
                        {
                            addressRegex: "^(bnb1)[0-9a-z]{38}$",
                            coin: "BTC",
                            depositDesc:
                                "Wallet Maintenance, Deposit Suspended", // shown only when "depositEnable" is false.
                            depositEnable: false,
                            isDefault: false,
                            memoRegex: "^[0-9A-Za-z\\-_]{1,120}$",
                            minConfirm: 1, // min number for balance confirmation
                            name: "BEP2",
                            network: "BNB",
                            specialTips:
                                "Both a MEMO and an Address are required to successfully deposit your BEP2-BTCB tokens to Binance.",
                            unLockConfirm: 0, // confirmation number for balance unlock
                            withdrawDesc:
                                "Wallet Maintenance, Withdrawal Suspended", // shown only when "withdrawEnable" is false.
                            withdrawEnable: false,
                            withdrawFee: "0.00000220",
                            withdrawIntegerMultiple: "0.00000001",
                            withdrawMax: "9999999999.99999999",
                            withdrawMin: "0.00000440",
                            sameAddress: true, // If the coin needs to provide memo to withdraw
                            estimatedArrivalTime: 25,
                            busy: false,
                            contractAddressUrl: "https://bscscan.com/token/",
                            contractAddress:
                                "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
                        },
                    ],
                },
            ];
            const data: CoinInformation[] = res;
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
                    coin: net!.coin,
                    name: net!.name,
                    ticker,
                    nets: net!.networkList.map((el) => ({
                        name: el.name,
                        coin: el.coin,
                        chain: el.network,
                        contractAddr: (el as any).contractAddress,
                        minComfirm: Number(el.minConfirm),
                        minWd: Number(el.withdrawMin),
                        maxWd: Number(el.withdrawMax),
                        minDp: 0,
                        maxDp: Infinity,
                        dpTip: el.depositDesc,
                        wdTip: el.withdrawDesc,
                        wdFee: Number(el.withdrawFee),
                        wdFeeUSDT: Number(el.withdrawFee) * ticker,
                        canDep: el.depositEnable,
                        canWd: el.withdrawEnable,
                    })),
                } as ICoinNets;
            });

            return nets.filter((el) => !ccy || el.coin == ccy);
        } catch (e) {
            this._log("FAILED TO GET NETS");
            this._err(e);
        }
    }
}
