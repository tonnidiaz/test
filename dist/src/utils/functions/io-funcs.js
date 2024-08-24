"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCointest = exports.onBacktest = void 0;
const funcs2_1 = require("../funcs2");
const constants_1 = require("../constants");
const fs_1 = require("fs");
const functions_1 = require("../functions");
const strategies_1 = require("@/strategies");
const consts_1 = require("../consts");
const funcs_1 = require("../orders/funcs");
const okx_instrus_1 = require("@/utils/data/instrus/okx-instrus");
const binance_info_1 = require("../binance-info");
const bybit_instrus_1 = require("../data/instrus/bybit-instrus");
const gateio_instrus_1 = require("@/utils/data/instrus/gateio-instrus");
const bitget_instrus_1 = require("@/utils/data/instrus/bitget-instrus");
const mexc_instrus_1 = require("../data/instrus/mexc-instrus");
let prevData = null;
const onBacktest = async (data, client, io) => {
    const ep = "backtest";
    try {
        const pair = data.symbol;
        let { interval, skip_existing, start, end, offline, platform, isHa, useFile, file, isParsed, clId, T, save, demo, parent } = data;
        demo = demo ?? false;
        console.log("ON BACKTEST");
        // CLEAR CONSOLE
        (0, functions_1.clearTerminal)();
        prevData = null;
        const startTs = Date.parse(start), endTs = Date.parse(end);
        let klinesPath;
        let klines = [];
        let trades = [];
        client?.emit(ep, "Getting klines...");
        const platName = platform.toLowerCase();
        const plat = new consts_1.platforms[platName]({ demo });
        let symbol = (0, functions_1.getSymbol)(pair, platName);
        const pxPr = (0, functions_1.getPricePrecision)(pair, platName);
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
        start = start ?? (0, funcs2_1.parseDate)(new Date());
        const year = start.split("-")[0];
        const pth = "src/data/klines/binance/SOL-USDT_5m_2023-01-01 00 00 00+02:00_2023-10-31 23 59 00+02:00.json";
        const subPath = demo ? "demo" : "live";
        klinesPath = test
            ? (0, funcs2_1.tuPath)(pth)
            : (0, funcs2_1.tuPath)(`${constants_1.klinesRootDir}/${platName.toLowerCase()}/${year}/${subPath}/${symbol}_${interval}m-${subPath}.json`);
        if (offline && !useFile) {
            console.log("IS OFFLINE");
            const tradesPath = (0, funcs2_1.tuPath)(`${constants_1.tradesRootDir}/${platName.toLocaleLowerCase()}/${year}/trades.json`);
            if (!(0, fs_1.existsSync)(klinesPath)) {
                const err = {
                    err: `${klinesPath} does not exist`,
                };
                client?.emit(ep, err);
                return;
            }
            if (T) {
                if ((0, fs_1.existsSync)(tradesPath)) {
                    trades = await require(tradesPath);
                    console.log({
                        trades: [trades[0], trades[trades.length - 1]],
                    });
                }
            }
        }
        else if (!offline && !useFile) {
            //const bot = new Bot({name:"Temp", base: baseCcy[0], ccy: baseCcy[1]})
            //const bybit = new Bybit(bot)
            if (save) {
                (0, funcs_1.ensureDirExists)(klinesPath);
            }
            const r = skip_existing && (0, fs_1.existsSync)(klinesPath)
                ? await require(klinesPath)
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
        if (offline && !useFile)
            console.log(`\nKLINES_PATH: ${klinesPath}\n`);
        if (useFile)
            console.log(`\nUse file\n`);
        console.log({ start, end });
        klines =
            useFile && file
                ? JSON.parse(file.toString("utf-8"))
                : offline
                    ? await require(klinesPath)
                    : klines;
        console.log({ startTs, m: Number(klines[0][0]), endTs });
        console.log({
            startTs: new Date(startTs),
            m: Number(klines[0][0]),
            endTs: new Date(endTs),
        });
        if (offline) {
            klines = klines.filter((el) => startTs <= Number(el[0]) && Number(el[0]) <= endTs);
        }
        client?.emit(ep, "Analyzing data...");
        klines = isParsed && useFile ? klines : (0, funcs2_1.parseKlines)(klines);
        let df = (0, funcs2_1.tuCE)(isHa && useFile ? klines : (0, funcs2_1.heikinAshi)(klines));
        const quote = pair[1];
        if (!useFile) {
            // Return oly df from startTs to endTs
            df = df.filter((el) => Date.parse(el.ts) <= endTs && Date.parse(el.ts) >= startTs);
        }
        let QUOTE_RATE = 1;
        switch (quote) {
            case "ETH":
                QUOTE_RATE = constants_1.ETH_RATE;
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
        let retData = strategies_1.objStrategies[strNum - 1].run({
            df,
            trades,
            balance: bal,
            lev,
            pair: pair,
            pGain,
            maker: plat.maker,
            taker: plat.taker,
            platNm: platName.toLowerCase(),
            parent: parent.toLowerCase()
        });
        let profit = (0, functions_1.toFixed)(retData.balance - bal, pxPr);
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
        const str_name = strategies_1.objStrategies[strNum - 1].name;
        console.log({ str_name });
        retData = { data: { ...retData, str_name }, clId };
        prevData = { ep, data: retData };
        client?.emit(ep, retData);
        return prevData;
    }
    catch (e) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};
exports.onBacktest = onBacktest;
const onCointest = async (data, client, io) => {
    const ep = "cointest";
    (0, functions_1.clearTerminal)();
    try {
        let { interval, start, end, offline, demo, platform, save, quote, prefix, skip_existing, from_last, skip_saved, fix_invalid, clId, show, parent, only } = data;
        const startPair = data.from;
        let _data = [];
        const _parseData = () => {
            _data = Array.from(new Set(_data.map((el) => JSON.stringify(el)))).map((el) => JSON.parse(el));
        };
        let result = {};
        let msg = "";
        prevData = null;
        const startTs = Date.parse(start), endTs = Date.parse(end);
        let klinesPath;
        console.log({ platform });
        const platName = platform.toLowerCase();
        const plat = new consts_1.platforms[platName]({ demo });
        const _platName = platform.toLowerCase();
        let _instruments;
        let last;
        start = start ?? (0, funcs2_1.parseDate)(new Date());
        const year = start.split("-")[0];
        const strNum = Number(data.strategy);
        prefix = prefix ?? "";
        const sub = demo ? "demo" : "live";
        const savePath = `_data/rf/coins/${year}/${sub}/${prefix}_${_platName}_${interval}m-${sub}.json`;
        client?.emit(ep, `${platform}: BEGIN COINTEST...`);
        if (only) {
            if (!(0, fs_1.existsSync)(savePath)) {
                client?.emit(ep, { err: "NOTHING TO SHOW" });
                return;
            }
        }
        else if (show) {
            if ((0, fs_1.existsSync)(savePath)) {
                result = { clId, platform, data: await require(savePath) };
                client?.emit(ep, result);
            }
            else {
                client?.emit(ep, { err: "NOTHING TO SHOW" });
            }
            return result;
        }
        if (_platName == "okx") {
            _instruments = okx_instrus_1.okxInstrus
                .filter((el) => el.state == "live")
                .map((el) => [el.baseCcy, el.quoteCcy]);
        }
        else {
            const okxCoinsPath = savePath.replace(_platName, "okx");
            let okxCoins = null;
            if ((0, fs_1.existsSync)(okxCoinsPath)) {
                okxCoins = await require(okxCoinsPath);
            }
            _instruments = [];
            switch (_platName) {
                case "bybit":
                    _instruments = bybit_instrus_1.bybitInstrus.filter(el => el.status == 'Trading').map((el) => [
                        el.baseCoin,
                        el.quoteCoin,
                    ]);
                    break;
                case "binance":
                    _instruments = binance_info_1.binanceInfo.symbols
                        .filter((el) => el.isSpotTradingAllowed == true)
                        .map((el) => [el.baseAsset, el.quoteAsset]);
                    break;
                case "gateio":
                    _instruments = gateio_instrus_1.gateioInstrus
                        .filter((el) => el.trade_status == "tradable")
                        .map((el) => [el.base, el.quote]);
                    break;
                case "bitget":
                    _instruments = bitget_instrus_1.bitgetInstrus
                        .filter((el) => el.status == "online")
                        .map((el) => [el.baseCoin, el.quoteCoin]);
                    break;
                case "mexc":
                    _instruments = mexc_instrus_1.mexcInstrus
                        .filter((el) => el.status == '1' && el.isSpotTradingAllowed)
                        .map((el) => [el.baseAsset, el.quoteAsset]);
                    break;
            }
            // if (okxCoins != null) {
            //     _instruments = _instruments.filter(
            //         (el) =>
            //             okxCoins!.findIndex(
            //                 (el2) => el2.pair.toString() == el.toString()
            //             ) == -1
            //     );
            // }
        }
        _instruments = _instruments.sort(); //.sort((a, b)=> a.toString() > b.toString() ? 1 : -1)
        let coins = _instruments;
        if (only) {
            coins = coins.filter(el => el[0] == only[0] && el[1] == only[1]);
        }
        else if (quote)
            coins = coins.filter((el) => el[1] == `${quote}`);
        if ((only || from_last) && (0, fs_1.existsSync)(savePath)) {
            _data = (await require(savePath)).sort((a, b) => a.pair > b.pair ? 1 : -1);
            if (from_last) {
                console.log("\nCONTINUING WHERE WE LEFT OF...\n");
                last = _data[_data.length - 1]?.pair;
            }
        }
        if (!only) {
            if (startPair) {
                coins = coins.slice(typeof startPair == "number"
                    ? startPair
                    : coins.findIndex((el) => el[0] == startPair[0]));
            }
            else if (last) {
                coins = coins.slice(coins.findIndex((el) => el.toString() == last.toString()));
                msg = `STARTING AT: ${coins[0]} -> last: ${last}`;
                console.log(msg);
                //client?.emit(ep, msg)
            }
        }
        //return []
        (0, funcs_1.ensureDirExists)(savePath);
        for (let pair of coins) {
            try {
                msg = `BEGIN PAIR ${pair}`;
                console.log(`${msg}`);
                //client?.emit(ep, msg)
                let klines = [];
                let trades = [];
                let bal = Number(data.bal);
                const symbol = (0, functions_1.getSymbol)(pair, platName);
                console.log(symbol);
                if (_data.length && only) {
                    // FILTER OUT THE CURRENT PAIR
                    _data = _data.filter(el => el.pair.toString() != only.toString());
                }
                const pxPr = (0, functions_1.getPricePrecision)(pair, platName);
                if (pxPr == null) {
                    msg = `PRICE PRECISION FOR ${symbol} NOT AVAIL`;
                    console.log(msg);
                    //client?.emit(ep, {err: msg})
                    continue;
                }
                klinesPath = (0, funcs2_1.tuPath)(`${constants_1.klinesRootDir}/${platName.toLowerCase()}/${year}/${sub}/${symbol}_${interval}m-${sub}.json`);
                if (!offline && skip_existing && (0, fs_1.existsSync)(klinesPath)) {
                    console.log("SKIPING", pair);
                    //client?.emit(ep, `SKIPPING ${pair}`)
                    continue;
                }
                if (offline && !(0, fs_1.existsSync)(klinesPath)) {
                    console.log("KLINES DIR NOT FOUND FOR", pair);
                    //client?.emit(ep, {err: `${klinesPath} not found`})
                    continue;
                }
                const r = offline || ((0, fs_1.existsSync)(klinesPath) && skip_saved)
                    ? await require(klinesPath)
                    : await plat.getKlines({
                        start: startTs,
                        end: endTs,
                        interval,
                        symbol,
                        savePath: save ? klinesPath : undefined,
                    });
                klines = r ?? [];
                if (!klines.length)
                    continue;
                const _klines = async (klines) => {
                    console.log(_klines);
                    const _ks = (0, funcs2_1.parseKlines)(klines);
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
                            if (!ret)
                                return;
                            klines = ret;
                            return await _klines(klines);
                        }
                        return _ks;
                    }
                    return _ks;
                };
                const _ks = await _klines(klines);
                if (!_ks)
                    continue;
                let df = (0, funcs2_1.tuCE)((0, funcs2_1.heikinAshi)(_ks));
                df = df.filter((el) => Date.parse(el.ts) <= endTs &&
                    Date.parse(el.ts) >= startTs);
                let QUOTE_RATE = 1;
                const quote = pair[1];
                switch (quote) {
                    case "ETH":
                        QUOTE_RATE = constants_1.ETH_RATE;
                    default:
                        console.log("IS_USDT");
                }
                console.log({ bal });
                bal /= QUOTE_RATE;
                console.log({ bal });
                let retData = strategies_1.objStrategies[strNum - 1].run({
                    df,
                    trades: [],
                    balance: bal,
                    lev: 1,
                    pair,
                    maker: plat.maker,
                    taker: plat.taker,
                    platNm: platName.toLowerCase(),
                    parent: parent.toLowerCase()
                });
                let profit = (0, functions_1.toFixed)(retData.balance - bal, pxPr);
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
                _data = [..._data].sort((a, b) => a.profit > b.profit ? -1 : 1);
                _parseData();
                (0, fs_1.writeFileSync)(savePath, JSON.stringify(_data), {});
                msg = `${pair} DONE`;
                console.log(msg, "\n");
                // result = {...result, data: _data, clId, platform}
                // result = {...result, data: _data, clId, platform}
                // prevData = { ep , data: result}
                // client?.emitWithAck(ep, result)
            }
            catch (e) {
                console.log(e);
                //client?.emit(ep, { err: `${pair}: Something went wrong` });
            }
        }
        _parseData();
        console.log("COINTEST DONE");
        result = { ...result, data: _data, clId, platform };
        prevData = { ep, data: result };
        client?.emit(ep, result);
        return prevData;
    }
    catch (e) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};
exports.onCointest = onCointest;
//# sourceMappingURL=io-funcs.js.map