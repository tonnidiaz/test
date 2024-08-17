import { Server, Socket } from "socket.io";
import { IObj, ICandle } from "../interfaces";
import { tuCE, heikinAshi, parseDate, parseKlines, tuPath } from "../funcs2";
import {
    ETH_RATE,
    klinesDir,
    klinesRootDir,
    tradesRootDir,
} from "../constants";
import { existsSync, writeFileSync } from "fs";
import { clog, getPricePrecision, readJson, toFixed, getSymbol, clearTerminal } from "../functions";
import { objStrategies, strategies } from "@/strategies";
import { TestOKX } from "@/classes/test-platforms";
import { platforms } from "../consts";
import { ensureDirExists } from "../orders/funcs";
import { okxInstrus } from "@/data/okx-instrus";
import { binanceInfo } from "../binance-info";
import { bybitInstrus } from "../bybit-instrus";
import { TestGateio } from "@/classes/test-gateio";
import { gateioInstrus } from "@/data/gateio-instrus";
import { bitgetInstrus } from "@/data/bitget-instrus";
let prevData: IObj | null = null;

export const onBacktest = async (data: IObj, client?: Socket, io?: Server) => {
     const ep = "backtest"
    try {
        const pair = data.symbol;
        let {
            interval,skip_existing,
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
        } = data;

        demo = demo ?? false;
        console.log("ON BACKTEST");
        // CLEAR CONSOLE
        clearTerminal()
        prevData = null;

       

        const startTs = Date.parse(start),
            endTs = Date.parse(end);

        let klinesPath: string | null;
        let klines: any[] = [];
        let trades: any[] = [];

        client?.emit(ep, "Getting klines...");

        

        const platName = platform.toLowerCase();
        
        const plat = new platforms[platName]({ demo });
        let symbol: string = getSymbol(pair, platName);
        const pxPr = getPricePrecision(pair, platName as any)

        console.log({ symbol, demo });

        if (pxPr == null) {
            client?.emit(ep, {err: `PRECISION FOR ${symbol} NOT AVAL`})
            return
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
                    trades = await require(tradesPath);
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
            const r = skip_existing && existsSync(klinesPath) ? await require(klinesPath) :  await plat.getKlines({
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
                ? await require(klinesPath!)
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
        klines = isParsed && useFile ? klines : parseKlines(klines);
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
        let retData = objStrategies[strNum - 1].run({
            df,
            trades,
            balance: bal,
            
            lev,
            pair: pair,
            pGain,
            maker: plat.maker,
            taker: plat.taker,
            platNm: platName.toLowerCase() as any,
        });

        let profit = toFixed(
            retData.balance - bal,
            pxPr
        );
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

        retData = { data: { ...retData, str_name }, clId };
        prevData = {ep, data: retData};
        client?.emit(ep, retData);
        return prevData;
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};

export const onCointest = async (data: IObj, client?: Socket, io?: Server) => {
    const ep = "cointest"
    clearTerminal()
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
            clId,
        } = data;
        const startPair = data.from;
        let _data: {
            pair: string[];
            profit: number;
            trades: number;
            aside: 0 | number;
            total: number;
        }[] = [];

        let result : IObj = {}
        let msg = ""

        prevData = null;
        const startTs = Date.parse(start),
            endTs = Date.parse(end);

        let klinesPath: string | null;
        console.log({platform})

        const platName = platform.toLowerCase();
        const plat = new platforms[platName]({demo})
        const _platName = platform.toLowerCase();
        let _instruments: string[][];
        let last: string[] | undefined;
        start = start ?? parseDate(new Date());
        const year = start.split("-")[0];

        const strNum = Number(data.strategy);

        prefix = prefix ?? "";
        const sub = demo ? "demo" : "live";
        const savePath = `data/rf/coins/${year}/${sub}/${prefix}_${_platName}_${interval}m-${sub}.json`;

        
        client?.emit(ep, `${platform}: BEGINE COINTEST...`)
        if (existsSync(savePath) && from_last) {
            _data = (await require(savePath)).sort((a, b) =>
                a.pair > b.pair ? 1 : -1
            );
            last = _data[_data.length - 1]?.pair;
        }

        if (_platName == "okx") {
            _instruments = okxInstrus
                .filter((el) => el.state == "live")
                .map((el) => [el.baseCcy, el.quoteCcy])
        } else {
            const okxCoinsPath = savePath.replace(_platName, "okx");
            let okxCoins: IObj[] | null = null;

            if (existsSync(okxCoinsPath)) {
                okxCoins = await require(okxCoinsPath);
            }
            if (_platName == "bybit") {
                _instruments = bybitInstrus
                    .map((el) => [el.baseCoin, el.quoteCoin])
            } else if (_platName == 'binance') {
                _instruments = binanceInfo.symbols
                    .filter((el) => el.isSpotTradingAllowed == true)
                    .map((el) => [el.baseAsset, el.quoteAsset])
                   
            }
            else if (_platName == 'gateio'){
                _instruments = gateioInstrus.filter(el => el.trade_status == 'tradable').map(el=> [el.base, el.quote])
            }
            else if (_platName == 'bitget'){
                _instruments = bitgetInstrus.filter(el => el.status == 'online').map(el=> [el.baseCoin, el.quoteCoin])
            }
            else {
                _instruments = []
            }

            _instruments = _instruments.sort()
            if (okxCoins != null) {
                _instruments = _instruments.filter(
                    (el) =>
                        okxCoins!.findIndex(
                            (el2) => el2.pair.toString() == el.toString()
                        ) == -1
                );
            }
        }

        let coins = _instruments;
        if (quote) coins = coins.filter((el) => el[1] == `${quote}`);
        if (!offline) {
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

                 msg = `STARTING AT: ${coins[0]} -> last: ${last}`
                console.log(msg);
                //client?.emit(ep, msg)
            }
        }

        //return []

        ensureDirExists(savePath);

        for (let pair of coins) {

            try{
                msg = `BEGIN PAIR ${pair}`
            console.log(`${msg}`);
            //client?.emit(ep, msg)
            let klines: any[] = [];
            let trades: any[] = [];
            let bal = Number(data.bal);
            const symbol = getSymbol(pair, platName)

            console.log(symbol);

            const pxPr = getPricePrecision(pair, platName as any)
            if (pxPr == null) {
                msg = `PRICE PRECISION FOR ${symbol} NOT AVAIL`
                console.log(msg)
                //client?.emit(ep, {err: msg})
                continue}

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
                    ? await require(klinesPath!)
                    : await plat.getKlines({
                          start: startTs,
                          end: endTs,
                          interval,
                          symbol,
                          savePath: save ? klinesPath : undefined,
                      });

            klines = r ?? [];
            if (!klines.length) continue;
            let df = tuCE(heikinAshi(parseKlines(klines)));

            df = df.filter(
                (el) =>
                    Date.parse(el.ts) <= endTs && Date.parse(el.ts) >= startTs
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
            let retData = objStrategies[strNum - 1].run({
                df,
                trades: [],
                balance: bal,
                lev: 1,
                pair,
                maker: plat.maker,
                taker: plat.taker,
                platNm: platName.toLowerCase() as any,
            });

            let profit = toFixed(
                retData.balance - bal,
                pxPr
            );

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
                pair,
                aside: retData.aside,
                profit: retData.profit,
                total: retData.profit + retData.aside,
                trades: retData.trades,
            });
            _data = [..._data].sort((a, b) => (a.profit > b.profit ? -1 : 1));
            writeFileSync(savePath, JSON.stringify(_data), {});

            msg = `${pair} DONE`
            console.log(msg, '\n');
           // result = {...result, data: _data, clId, platform}
            // result = {...result, data: _data, clId, platform}
            // prevData = { ep , data: result}
            // client?.emitWithAck(ep, result)

            }
            catch(e: any){
                console.log(e);
                //client?.emit(ep, { err: `${pair}: Something went wrong` });
            }
        }
        console.log("COINTEST DONE")
            result = {...result, data: _data, clId, platform}
            prevData = { ep , data: result}

                client?.emit(ep, result)
            
        return prevData;
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};
