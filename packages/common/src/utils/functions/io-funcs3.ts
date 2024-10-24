import { Socket } from "socket.io";
import { Server } from "ws";
import { ARBIT_ZERO_FEES, ARBIT_MIN_PERC } from "../constants";
import { getInstrus, getKlinesPath, getMakerFee, getTakerFee } from "../funcs3";
import { IObj, IRetData } from "../interfaces";
import { heikinAshi, parseKlines, tuCE } from "../funcs2";
import {
    getPricePrecision,
    getCoinPrecision,
    clearTerminal,
    getSymbol,
} from "../functions";
import { writeFileSync, existsSync } from "fs";
import { test_platforms } from "../consts";
import { TestPlatform } from "@cmn/classes/test-platforms";
import { objStrategies } from "@cmn/strategies";
import { Arbit } from "@cmn/bots/arbitrage/classes";
import { ensureDirExists, writeJson, readJson } from "../bend/functions";
export const onCrossArbitCointest = async (
    data: IObj,
    client?: Socket,
    io?: Server
) : Promise<IRetData | undefined> => {
    let {
        platA,
        platB,
        interval,
        start,
        end,
        demo,
        bal,
        show,
        only,
        join,
        prefix,
        save,
        clId,
        offline,
        skip_saved,
        save_klines,
        start_pair,
        perc,
        strNum
        // flipped,
    } = data;
    const ep = "cross-arbit-cointest";
    clearTerminal();
    console.log("PID:", process.pid);
    try {
        console.log("BEGIN CROSS COINTEST...\n");
        client?.emit(ep, "BEGIN CROSS COINTEST...");
        prefix = prefix ? `${prefix}_` : "";

        const MAKER_A = ARBIT_ZERO_FEES ? 0 : getMakerFee(platA),
            TAKER_A = ARBIT_ZERO_FEES ? 0 : getTakerFee(platA);

        const MAKER_B = ARBIT_ZERO_FEES ? 0 : getMakerFee(platB),
            TAKER_B = ARBIT_ZERO_FEES ? 0 : getTakerFee(platB);

        const MIN_PERC = perc ? Number(perc) : ARBIT_MIN_PERC;

        bal = Number(bal);
        const START_BAL = bal;

        let msg = "";

        const year = Number(start.split("-")[0]);

        let instrusA = getInstrus(platA);
        let instrusB = getInstrus(platB);
        //instrusA = instrusA.filter((el) => el[1] == "USDT");
        //instrusB = instrusB.filter((el) => el[1] == "USDT");

        if (only) {
            const _base = only[0], _quote = only[1]
            console.log({_base, _quote})
            instrusA = instrusA.filter(
                (el) => el[0] == only[0] && el[1] == only[1]
            );
            instrusB = instrusB.filter(
                (el) => el[0] == only[0] && el[1] == only[1]
            );
        }
        instrusA = instrusA.filter(
            (el) =>
                instrusB.findIndex((el2) => el2.toString() == el.toString()) !=
                -1
        );
        instrusB = instrusA.filter(
            (el) =>
                instrusA.findIndex((el2) => el2.toString() == el.toString()) !=
                -1
        );

        let _data: {
            pair: string[];
            profit: number;
            trades: number;
        }[] = [];
        let last: string[] | undefined;

        const savePath = `_data/rf/arbit/coins/${year}/${MIN_PERC}%_${prefix}${platA}-${platB}_${interval}m.json`;
        console.log({ savePath });

        let ret_data: IRetData = {clId, ep, data:{}};

        const parseData = (orders?: any[]) => {
            _data = _data.sort((a, b) => (a.profit > b.profit ? -1 : 1));
            ret_data = {
                ...ret_data,
                data: _data,
                ep,
                clId,
                orders: ret_data.orders ?? orders,
            };
            return ret_data;
        };
        
        if (show) {
            if (!existsSync(savePath)) {
                client?.emit(ep, { err: savePath + " DOES TO EXIST" });
                return
            }
            _data = await readJson(savePath);
            client?.emit(ep, parseData());
            return ret_data;
        }
        if (only){
            console.log(`DOING ${only} ONLY...\n`)
            
        }
        

        if ((join) && existsSync(savePath)) {
            _data = (await readJson(savePath)).sort((a, b) =>
                a.pair > b.pair ? 1 : -1
            );

            if (join) {
                console.log("\nCONTINUING WHERE WE LEFT OF...\n");

                last = _data[_data.length - 1]?.pair;
            }
        }

        if (!only) {
            if (start_pair) {
                instrusA = instrusA.slice(
                    typeof start_pair == "number"
                        ? start_pair
                        : instrusA.findIndex((el) => el[0] == start_pair[0])
                );
                instrusB = instrusB.slice(
                    typeof start_pair == "number"
                        ? start_pair
                        : instrusB.findIndex((el) => el[0] == start_pair[0])
                );
            } else if (last) {
                instrusA = instrusA.slice(
                    instrusA.findIndex(
                        (el) => el.toString() == last!.toString()
                    )
                );
                instrusB = instrusB.slice(
                    instrusB.findIndex(
                        (el) => el.toString() == last!.toString()
                    )
                );

                msg = `STARTING AT: ${instrusA[0]} -> last: ${last}`;
                console.log(msg);
                //client?.emit(ep, msg)
            }
        }
        const iLen = instrusA.length;
        const instrus = instrusA.sort();

        console.log({total: instrus.length});
        if (!instrus.length){
            console.log("NO INSTRUS")
            client?.emit(ep, {err: "NO INSTRUS"})
            return undefined
        }
        ensureDirExists(savePath);

        const _save = () => {
            if (save) {
                writeFileSync(savePath, JSON.stringify(_data));
                console.log("SAVED\n");
            }
        };

        

        for (let i = 0; i < iLen; i++) {
            const pair = instrus[i];
            const symboA = getSymbol(pair, platA)
            const symboB = getSymbol(pair, platB)
            try{
                console.log("\nBEGIN PAIR", pair);
                client?.emit(ep, `BEGIN PAIR: [${pair}]`);
    
                const k1Path = getKlinesPath({
                    plat: platA,
                    pair,
                    interval,
                    year,
                    demo,
                });
                const k2Path = getKlinesPath({
                    plat: platB,
                    pair,
                    interval,
                    year,
                    demo,
                });
    
                const pxPrA = getPricePrecision(pair, platA);
                const pxPrB = getPricePrecision(pair, platB);
                const basePrA = getCoinPrecision(pair, "limit", platA);
                const basePrB = getCoinPrecision(pair, "limit", platB);
                console.log({pxPrA, basePrA, pxPrB, basePrB})
    
                if (pxPrA == null || basePrA == null || pxPrB == null || basePrB == null) {
                    console.log("Precision error:", { pxPrA, basePrA, pxPrB, basePrB });
                    continue;
                }
                if (offline && !existsSync(k1Path)) {
                    console.log(k1Path, "DOES NOT EXIST");
                    continue;
                }
                if (offline && !existsSync(k2Path)) {
                    console.log(k2Path, "DOES NOT EXIST");
                    continue;
                }
                const startMs = Date.parse(start);
                const endMs = Date.parse(end);
                const PlatA: TestPlatform = new test_platforms[platA]({demo})
                const PlatB: TestPlatform = new test_platforms[platB]({demo})
    
                let kA = offline || (skip_saved && existsSync(k1Path))
                ? await readJson(k1Path)
                : await PlatA.getKlines({
                      start: startMs,
                      end: endMs,
                      symbol: symboA,
                      interval,
                      savePath: save_klines ? k1Path : undefined,
                  });//await readJson(k1Path);
                let kB = offline || (skip_saved && existsSync(k2Path))
                ? await readJson(k2Path)
                : await PlatB.getKlines({
                      start: startMs,
                      end: endMs,
                      symbol: symboB,
                      interval,
                      savePath: save_klines ? k2Path : undefined,
                  });//await readJson(k2Path);
    
                if (!kA.length || !kB.length) continue;
     
                kA = kA.filter((el) => {
                    const tsMs = Number(el[0]);
                    
                    return tsMs >= startMs && tsMs <= endMs;
                });
    
                kB = kB.filter((el) => {
                    const tsMs = Number(el[0]);
                    return tsMs >= startMs && tsMs <= endMs;
                });

                let dfA = parseKlines(kA),
                    dfB = parseKlines(kB);
                    
                // START AT THE LATEST START
                const realStartMs = Math.max(
                    Date.parse(dfA[0].ts),
                    Date.parse(dfB[0].ts)
                );
    
                dfA = dfA.filter((el) => {
                    const tsMs = Date.parse(el.ts);
                    return tsMs >= realStartMs;
                });
    
                dfB = dfB.filter((el) => {
                    const tsMs = Date.parse(el.ts);
                    return tsMs >= realStartMs;
                });
                const strat = objStrategies[strNum - 1]
                console.log({strat: strat.name})
                const bt = new Arbit({
                    platA,
                    platB,
                    MAKER: MAKER_B,
                    TAKER: TAKER_A, 
                    bal,
                    dfA,
                    dfB,
                    pair ,
                    basePrA,
                    basePrB,
                    pxPrA,
                    pxPrB,
                    MIN_PERC, 
                    // strat
                });
                const res = await bt.run();
                _data.push({
                    pair,
                    profit: res.profit,
                    trades: res.tradeCnt,
                });
                //_data = [..._data].sort((a, b) => (a.profit > b.profit ? -1 : 1));
                parseData(res.trades);
                _save();
                console.log(`\n${pair} DONE`);
                client?.emit(ep, `${pair} DONE`);
            }catch(e){
                console.log(`"PAIR: ${pair} ERROR`)
                console.log(e)
                continue
            }

            
        }
        _data = [..._data].sort((a, b) => (a.profit > b.profit ? -1 : 1));
        _save();
        client?.emit(ep, "ALL DONE");
        client?.emit(ep, ret_data);
        console.log("\nALL DONE"); 
        return ret_data;
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};
