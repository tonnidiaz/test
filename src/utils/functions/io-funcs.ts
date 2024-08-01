import { Server, Socket } from "socket.io";
import { IObj } from "../interfaces";
import { tuCE, heikinAshi, parseDate, parseKlines, tuPath } from "../funcs2";
import {
    instruments,
    klinesDir,
    klinesRootDir,
    tradesRootDir,
} from "../constants";
import { existsSync, writeFileSync } from "fs";
import { clog, getPricePrecision, readJson, toFixed } from "../functions";
import { objStrategies, strategies } from "@/strategies";
import { TestOKX } from "@/classes/test-platforms";
import { platforms } from "../consts";
import { ensureDirExists } from "../orders/funcs";
import { okxInstrus } from "@/data/okx-instrus";
import { binanceInfo } from "../binance-info";
let prevData: IObj | null = null;

export const onBacktest = async (data: IObj, client?: Socket, io?: Server) => {
    try {
        const baseCcy = data.symbol;
        let {
            interval,
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
        } = data;

        console.log("ON BACKTEST");
        prevData = null;
        const startTs = Date.parse(start),
            endTs = Date.parse(end);

        let klinesPath: string | null;
        let klines: any[] = [];
        let trades: any[] = [];

        client?.emit("backtest", "Getting klines...");

        const plat = platforms[platform].obj;
        const platName = platforms[platform].name;
        let symbol: string =
            plat instanceof TestOKX ? baseCcy.join("-") : baseCcy.join("");
        console.log(symbol);
        const test = false;
        if (useFile && !file) {
            client?.emit("backtest", { err: "File required" });
            return;
        }
        start = start ?? parseDate(new Date());
        const year = start.split("-")[0];
        const pth =
            "src/data/klines/binance/SOL-USDT_5m_2023-01-01 00 00 00+02:00_2023-10-31 23 59 00+02:00.json";
        klinesPath = test
            ? tuPath(pth)
            : tuPath(
                  `${klinesRootDir}/${platName.toLowerCase()}/${year}/${symbol}_${interval}m.json`
              );
        if (offline && !useFile) {
            console.log("IS OFFLINE");

            const tradesPath = tuPath(
                `${tradesRootDir}/${platName.toLocaleLowerCase()}/${year}/trades.json`
            );

            if (!existsSync(klinesPath!)) {
                const err = {
                    err: `DataFrame for ${symbol} in ${year} at ${interval}m does not exist`,
                };
                client?.emit("backtest", err);
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
            const r = await plat.getKlines({
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

        client?.emit("backtest", "Analyzing data...");
        klines = isParsed && useFile ? klines : parseKlines(klines);
        let df = tuCE(isHa && useFile ? klines : heikinAshi(klines));

        if (!useFile) {
            // Return oly df from startTs to endTs
            df = df.filter(
                (el) =>
                    Date.parse(el.ts) <= endTs && Date.parse(el.ts) >= startTs
            );
        }
        let bal = Number(data.bal);

        client?.emit("backtest", "Backtesting....");

        const lev = data.lev ? Number(data.lev) : 1;
        const strNum = Number(data.strategy);

        const pGain = data.pGain ? Number(data.pGain) : undefined;
        let retData = objStrategies[strNum - 1].run({
            df,
            trades,
            balance: bal,
            lev,
            pair: baseCcy,
            pGain,
            maker: plat.maker,
            taker: plat.taker,
            platNm: platName.toLowerCase() as any,
        });
        retData.profit = toFixed(
            retData.balance - bal,
            getPricePrecision(baseCcy, platName as any)
        );
        retData = { ...retData, base: baseCcy[0], ccy: baseCcy[1] };

        console.log(`TRADES: ${retData.trades}`);
        console.log(`PROFIT: ${retData.profit}\n`);
        const str_name = objStrategies[strNum - 1].name;
        console.log({ str_name });

        retData = { data: { ...retData, str_name }, clId };
        prevData = retData;
        client?.emit("backtest", retData);
        return retData;
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit("backtest", { err: "Something went wrong" });
    }
};

export const onCoins = async (data: IObj, client?: Socket, io?: Server) => {
    try {
        let { interval, start, end, offline, platform, save } = data;
        const startPair = data.from;
        let _data: {
            pair: string[];
            interval: number;
            profit: number;
            trades: number;
        }[] = [];

        prevData = null;
        const startTs = Date.parse(start),
            endTs = Date.parse(end);

        let klinesPath: string | null;

        const plat = platforms[platform].obj;
        const platName = platforms[platform].name;
        const _platName = platName.toLowerCase();
        let _instruments: string[][];
        let last: string[] | undefined;
        start = start ?? parseDate(new Date());
        const year = start.split("-")[0];

        const strNum = Number(data.strategy);

        const savePath = `data/rf/coins/${year}/${_platName}_${interval}m.json`;

        if (existsSync(savePath)){
            _data = (await require(savePath)).sort((a, b) => (a.pair > b.pair ? 1 : -1))
            last = _data[_data.length - 1].pair
        }

        if (_platName == "okx") {
            _instruments = okxInstrus
                .filter((el) => el.state == "live")
                .map((el) => [el.baseCcy, el.quoteCcy])
                .sort();
        } else if (_platName == "bybit") {
            _instruments = instruments
                .map((el) => [el.baseCoin, el.quoteCoin])
                .sort();
        }else{
            const okxCoinsPath = savePath.replace(_platName, 'okx')
            let okxCoins: IObj[] | null = null

            if (existsSync(okxCoinsPath)){
                okxCoins = await require(okxCoinsPath) 
            }
            _instruments = binanceInfo.symbols.filter(el=> el.isSpotTradingAllowed == true).map(el=> [el.baseAsset, el.quoteAsset]).sort()
            if (okxCoins != null){
                _instruments = _instruments.filter(el=> okxCoins!.findIndex(el2 => el2.pair.toString() == el.toString()) == -1 )
            }
        }

        let coins = _instruments.filter((el) => el[1] == "USDT");
        if (!offline) {
            if (startPair){
               coins = coins.slice(
                typeof startPair == "number"
                    ? startPair
                    : coins.findIndex((el) => el[0] == startPair[0])
            ); 
            }else if (last){
                coins = coins.slice(coins.findIndex(el=> el.toString() == last.toString()))
                console.log("STARTING AT:", coins[0], {last});
            }
            
        }

        //return []
        
        ensureDirExists(savePath);

        for (let pair of coins) {
            console.log("\nBEGIN PAIR:", pair);
            let klines: any[] = [];
            let trades: any[] = [];
            let bal = Number(data.bal);
            let symbol: string =
                plat instanceof TestOKX ? pair.join("-") : pair.join("");
            console.log(symbol);

            klinesPath = tuPath(
                `${klinesRootDir}/${platName.toLowerCase()}/${year}/${symbol}_${interval}m.json`
            );

            if (offline && !existsSync(klinesPath)) {
                console.log("KLINES DIR NOT FOUND FOR", pair);
                continue;
            }
            const r =
                offline || existsSync(klinesPath)
                    ? await require(klinesPath!)
                    : await plat.getKlines({
                          start: startTs,
                          end: endTs,
                          interval,
                          symbol,
                          savePath: save ? klinesPath : undefined,
                      });

            klines = r ?? [];

            let df = tuCE(heikinAshi(parseKlines(klines)));

            df = df.filter(
                (el) =>
                    Date.parse(el.ts) <= endTs && Date.parse(el.ts) >= startTs
            );
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
            retData.profit = toFixed(
                retData.balance - bal,
                getPricePrecision(pair, platName as any)
            );
            retData = { ...retData, base: pair[0], ccy: pair[1] };

            console.log(pair, `TRADES: ${retData.trades}`);
            console.log(pair, `PROFIT: ${retData.profit}\n`);
            _data.push({
                pair,
                profit: retData.profit,
                interval,
                trades: retData.trades,
            });
            _data = [..._data].sort((a, b) => (a.profit > b.profit ? -1 : 1));
            writeFileSync(savePath, JSON.stringify(_data), {});
            console.log(pair, "SAVED\n");
        }

        return _data;
    } catch (e) {
        console.log(e);
        return "SOMETHING WENT WRONG";
    }
};
