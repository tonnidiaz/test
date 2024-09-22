import { Server, Socket } from "socket.io";
import { IObj, ICandle, TPlatName, IRetData } from "../interfaces";
import { tuCE, heikinAshi, parseDate, parseKlines, tuPath } from "../funcs2";
import {
    ETH_RATE,
    klinesDir,
    klinesRootDir,
    tradesRootDir,
} from "../constants";
import { existsSync, writeFileSync } from "fs";
import {
    clog,
    getPricePrecision,
    readJson,
    toFixed,
    getSymbol,
    clearTerminal,
    sleep,
} from "../functions";
import { objStrategies, strategies } from "@/strategies";
import { TestOKX } from "@/classes/test-platforms";
import { test_platforms } from "../consts";
import { ensureDirExists } from "../orders/funcs";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { binanceInfo } from "../binance-info";
import { bybitInstrus } from "../data/instrus/bybit-instrus";
import { TestGateio } from "@/classes/test-gateio";
import { gateioInstrus } from "@/utils/data/instrus/gateio-instrus";
import { bitgetInstrus } from "@/utils/data/instrus/bitget-instrus";
import { mexcInstrus } from "../data/instrus/mexc-instrus";
import { getInstrus } from "../funcs3";
import { onTriArbitCointest } from "./io-funcs2";

export const onBacktest = async (data: IObj, client?: Socket, io?: Server) => {
    const ep = "backtest";
    try {
        const pair = data.symbol;
        let {
            interval,
            skip_existing,
            start,
            end,
            offline,
            platform,
            isHa,
            useFile,
            file,
            isParsed,
            clId,
            T,
            save,
            demo,
            parent,
            useInvalid,
        } = data;

        demo = demo ?? false;
        console.log("ON BACKTEST");
        // CLEAR CONSOLE
        clearTerminal();
        let prevData: IRetData = { clId, ep, data: {} };

        const startTs = Date.parse(start),
            endTs = Date.parse(end);

        let klinesPath: string | null;
        let klines: any[] = [];
        let trades: any[] = [];

        client?.emit(ep, "Getting klines...");

        const platName = platform.toLowerCase();

        const plat = new test_platforms[platName]({ demo });
        let symbol: string = getSymbol(pair, platName);
        const pxPr = getPricePrecision(pair, platName as any);

        console.log({ symbol, demo });

        if (pxPr == null) {
            client?.emit(ep, { err: `PRECISION FOR ${symbol} NOT AVAL` });
            return;
        }
        const test = false;
        if (useFile && !file) {
            client?.emit(ep, { err: "File required" });
            return;
        }
        start = start ?? parseDate(new Date());
        const year = start.split("-")[0];
        const pth =
            "src/data/klines/binance/SOL-USDT_5m_2023-01-01 00 00 00+02:00_2023-10-31 23 59 00+02:00.json";
        const subPath = demo ? "demo" : "live";
        klinesPath = test
            ? tuPath(pth)
            : tuPath(
                  `${klinesRootDir}/${platName.toLowerCase()}/${year}/${subPath}/${symbol}_${interval}m-${subPath}.json`
              );
        if (offline && !useFile) {
            console.log("IS OFFLINE");

            const tradesPath = tuPath(
                `${tradesRootDir}/${platName.toLocaleLowerCase()}/${year}/trades.json`
            );

            if (!existsSync(klinesPath!)) {
                const err = {
                    err: `${klinesPath} does not exist`,
                };
                client?.emit(ep, err);
                return;
            }
            if (T) {
                if (existsSync(tradesPath)) {
                    trades = await readJson(tradesPath);
                    console.log({
                        trades: [trades[0], trades[trades.length - 1]],
                    });
                }
            }
        } else if (!offline && !useFile) {
            //const bot = new Bot({name:"Temp", base: baseCcy[0], ccy: baseCcy[1]})
            //const bybit = new Bybit(bot)
            if (save) {
                ensureDirExists(klinesPath);
            }
            const r =
                skip_existing && existsSync(klinesPath)
                    ? await readJson(klinesPath)
                    : await plat.getKlines({
                          start: startTs,
                          end: endTs,
                          interval,
                          symbol,
                          savePath: save ? klinesPath : undefined,
                      });
            if (!r) {
                client?.emit("err", "Failed to get klines");
                return;
            }
            const r2 = !T
                ? []
                : await plat.getTrades({
                      start: startTs,
                      end: endTs,
                      symbol,
                  });
            if (!r2) {
                client?.emit("err", "Failed to get trades");
                return;
            }
            trades = r2;
            klines = r;
        }

        if (offline && !useFile) console.log(`\nKLINES_PATH: ${klinesPath!}\n`);
        if (useFile) console.log(`\nUse file\n`);
        console.log({ start, end });
        klines =
            useFile && file
                ? JSON.parse(file.toString("utf-8"))
                : offline
                ? await readJson(klinesPath!)
                : klines;
        console.log({ startTs, m: Number(klines[0][0]), endTs });
        console.log({
            startTs: new Date(startTs),
            m: Number(klines[0][0]),
            endTs: new Date(endTs),
        });
        if (offline) {
            klines = klines.filter(
                (el) => startTs <= Number(el[0]) && Number(el[0]) <= endTs
            );
        }

        client?.emit(ep, "Analyzing data...");
        klines = isParsed && useFile ? klines : parseKlines(klines, useInvalid);
        let df = tuCE(isHa && useFile ? klines : heikinAshi(klines));

        const quote = pair[1];

        if (!useFile) {
            // Return oly df from startTs to endTs
            df = df.filter(
                (el) =>
                    Date.parse(el.ts) <= endTs && Date.parse(el.ts) >= startTs
            );
        }

        let QUOTE_RATE = 1;
        switch (quote) {
            case "ETH":
                QUOTE_RATE = ETH_RATE;
            default:
                console.log("IS_USDT");
        }

        let bal = Number(data.bal);
        console.log({ bal });
        bal /= QUOTE_RATE;
        console.log({ bal });

        client?.emit(ep, "Backtesting....");

        const lev = data.lev ? Number(data.lev) : 1;
        const strNum = Number(data.strategy);

        const pGain = data.pGain ? Number(data.pGain) : undefined;
        let retData = await objStrategies[strNum - 1].run({
            df,
            trades,
            balance: bal,
            lev,
            pair: pair,
            pGain,
            maker: plat.maker,
            taker: plat.taker,
            platNm: platName.toLowerCase() as any,
            parent: parent.toLowerCase(),
        });

        let profit = toFixed(retData.balance - bal, pxPr);
        console.log({ balance: retData.balance, aside: retData.aside, profit });
        retData.balance *= QUOTE_RATE;
        retData.aside *= QUOTE_RATE;
        profit *= QUOTE_RATE;
        console.log({ balance: retData.balance, aside: retData.aside, profit });

        //console.log(`PROFIT: ${pair[1]} ${profit}`);
        //profit  *= (pair[1] == 'ETH' ? ETH_RATE : 1)
        retData.profit = profit;
        console.log(`PROFIT: USDT ${profit}`);
        retData = { ...retData, base: pair[0], ccy: pair[1] };

        console.log(`TRADES: ${retData.trades}`);

        const str_name = objStrategies[strNum - 1].name;
        console.log({ str_name });

        prevData = { ...prevData, data: { ...retData, str_name } };
        client?.emit(ep, prevData);
        return prevData;
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};

export const onCointest = async (data: IObj, client?: Socket, io?: Server) => {
    const ep = "cointest";
    clearTerminal();
    try {
        let {
            interval,
            start,
            end,
            offline,
            demo,
            platform,
            save,
            quote,
            prefix,
            skip_existing,
            from_last,
            skip_saved,
            fix_invalid,
            clId,
            show,
            parent,
            only,
            useInvalid,
        } = data;
        const startPair = data.from;
        let _data: {
            pair: string;
            profit: number;
            trades: number;
            aside?: number;
            total?: number;
        }[] = [];

        const _parseData = () => {
            _data = Array.from(
                new Set(_data.map((el) => JSON.stringify(el)))
            ).map((el) => JSON.parse(el));
        };
        only = only?.length == 2 ? only : undefined;

        let result: IObj = {};
        let msg = "";

        let prevData: IRetData = { clId, ep, data: {} };
        const startTs = Date.parse(start),
            endTs = Date.parse(end);

        let klinesPath: string | undefined;
        console.log({ platform });

        const platName: TPlatName = platform.toLowerCase();
        const plat = new test_platforms[platName]({ demo });

        const _platName = platform.toLowerCase();
        let _instruments: string[][];
        let last: string[] | undefined;
        start = start ?? parseDate(new Date());
        const year = start.split("-")[0];

        const strNum = Number(data.strategy);
        const str = objStrategies[strNum - 1];

        prefix = prefix ? `${prefix}_` : "";
        const sub = demo ? "demo" : "live";

        const savePath = `_data/rf/coins/${year}/${sub}/${prefix}${_platName}_${str.name}_${interval}m-${sub}.json`;

        client?.emit(ep, `${platform}: BEGIN COINTEST...`);

        if (only) {
        } else if (show) {
            if (existsSync(savePath)) {
                prevData = {
                    ...prevData,
                    platform,
                    data: await readJson(savePath),
                };
                client?.emit(ep, prevData);
            } else {
                client?.emit(ep, { err: "NOTHING TO SHOW" });
            }

            return prevData;
        }

        _instruments = getInstrus(_platName);
        _instruments = _instruments.sort(); //.sort((a, b)=> a.toString() > b.toString() ? 1 : -1)
        let coins = _instruments;

        if (only) {
            coins = coins.filter((el) => el[0] == only[0] && el[1] == only[1]);
        } else if (quote) coins = coins.filter((el) => el[1] == `${quote}`);

        if (from_last && existsSync(savePath)) {
            console.log("HERE", only);
            _data = (await readJson(savePath)).sort((a, b) =>
                a.pair > b.pair ? 1 : -1
            );

            if (from_last) {
                console.log("\nCONTINUING WHERE WE LEFT OF...\n");

                last = _data[_data.length - 1]?.pair.split('/');
            }
        }

        if (!only) {
            if (startPair) {
                coins = coins.slice(
                    typeof startPair == "number"
                        ? startPair
                        : coins.findIndex((el) => el[0] == startPair[0])
                );
            } else if (last) {
                coins = coins.slice(
                    coins.findIndex((el) => el.toString() == last!.toString())
                );

                msg = `STARTING AT: ${coins[0]} -> last: ${last}`;
                console.log(msg);
                //client?.emit(ep, msg)
            }
        }

        //return []

        ensureDirExists(savePath);

        for (let pair of coins) {
            try {
                //await sleep(0.0000001);
                msg = `BEGIN PAIR ${pair}`;
                console.log(`${msg}`);
                //client?.emit(ep, msg)
                let klines: any[] = [];
                let trades: any[] = [];
                let bal = Number(data.bal);
                const symbol = getSymbol(pair, platName);

                console.log(symbol);
                if (_data.length && only) {
                    // FILTER OUT THE CURRENT PAIR
                    _data = _data.filter(
                        (el) => el.pair.toString() != only.toString()
                    );
                }
                const pxPr = getPricePrecision(pair, platName as any);
                if (pxPr == null) {
                    msg = `PRICE PRECISION FOR ${symbol} NOT AVAIL`;
                    console.log(msg);
                    //client?.emit(ep, {err: msg})
                    continue;
                }

                klinesPath = tuPath(
                    `${klinesRootDir}/${platName.toLowerCase()}/${year}/${sub}/${symbol}_${interval}m-${sub}.json`
                );
                if (!offline && skip_existing && existsSync(klinesPath)) {
                    console.log("SKIPING", pair);
                    //client?.emit(ep, `SKIPPING ${pair}`)
                    continue;
                }

                if (offline && !existsSync(klinesPath)) {
                    console.log("KLINES DIR NOT FOUND FOR", pair);
                    //client?.emit(ep, {err: `${klinesPath} not found`})
                    continue;
                }
                const r =
                    offline || (existsSync(klinesPath) && skip_saved)
                        ? await readJson(klinesPath!)
                        : await plat.getKlines({
                              start: startTs,
                              end: endTs,
                              interval,
                              symbol,
                              savePath: save ? klinesPath : undefined,
                          });

                klines = r ?? [];
                if (!klines.length) continue;
                const _klines = async (klines: string[][]) => {
                    console.log(_klines);
                    const _ks = parseKlines(klines, useInvalid);

                    if (klines.length != _ks.length) {
                        console.log(`[${pair}] KLINES IVALID`);
                        if (fix_invalid) {
                            const ret = await plat.getKlines({
                                start: startTs,
                                end: endTs,
                                interval,
                                symbol,
                                savePath: klinesPath,
                            });

                            if (!ret) return;
                            klines = ret;
                            return await _klines(klines);
                        }

                        return _ks;
                    }
                    return _ks;
                };
                const _ks = await _klines(klines);
                if (!_ks) continue;

                let df = tuCE(heikinAshi(_ks));

                df = df.filter(
                    (el) =>
                        Date.parse(el.ts) <= endTs &&
                        Date.parse(el.ts) >= startTs
                );

                let QUOTE_RATE = 1;
                const quote = pair[1];
                switch (quote) {
                    case "ETH":
                        QUOTE_RATE = ETH_RATE;
                    default:
                        console.log("IS_USDT");
                }
                console.log({ bal });
                bal /= QUOTE_RATE;
                console.log({ bal });
                let retData = await str.run({
                    df,
                    trades: [],
                    balance: bal,
                    lev: 1,
                    pair,
                    maker: plat.maker,
                    taker: plat.taker,
                    platNm: platName.toLowerCase() as any,
                    parent: parent.toLowerCase(),
                });

                let profit = toFixed(retData.balance - bal, 2);

                console.log({
                    balance: retData.balance,
                    aside: retData.aside,
                    profit,
                });

                retData.balance *= QUOTE_RATE;
                retData.aside *= QUOTE_RATE;
                profit *= QUOTE_RATE;
                console.log({
                    balance: retData.balance,
                    aside: retData.aside,
                    profit,
                });
                retData.profit = profit;
                retData = { ...retData, base: pair[0], ccy: pair[1] };

                console.log(pair, `TRADES: ${retData.trades}`);
                console.log(pair, `PROFIT: ${retData.profit}\n`);
                _data.push({
                    pair: pair.join('/'),
                    profit: retData.profit,
                    // aside: retData.aside,
                    // total: retData.profit + retData.aside,
                    trades: retData.trades,
                });
                _data = [..._data].sort((a, b) =>
                    a.profit > b.profit ? -1 : 1
                );

                _parseData();
                if (!only) writeFileSync(savePath, JSON.stringify(_data), {});

                msg = `${pair} DONE`;
                console.log(msg, "\n");
                // result = {...result, data: _data, clId, platform}
                // result = {...result, data: _data, clId, platform}
                // prevData = { ep , data: result}
                // client?.emitWithAck(ep, result)
            } catch (e: any) {
                console.log(e);
                //client?.emit(ep, { err: `${pair}: Something went wrong` });
            }
        }

        _parseData();

        console.log("COINTEST DONE");
        prevData = { ...prevData, ...result, data: _data, platform };

        client?.emit(ep, prevData);

        return prevData;
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};

export const onArbitCointest = async (
    data: IObj,
    client?: Socket,
    io?: Server
) => {
    const ep = "arbit-cointest";
    try {
        clearTerminal();
        console.log("PID:", process.pid);
        if (data.type == "tri") {
            console.log("TRIANGULAR ARBITRAGE\n");

            return await onTriArbitCointest({ ...data, ep }, client);
        }
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};
