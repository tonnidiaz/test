import { Server, Socket } from "socket.io";
import { IObj, ICandle, TPlatName, IRetData } from "../interfaces";
import { tuCE, heikinAshi, parseKlines, tuPath } from "../funcs2";
import {
    ARBIT_MIN_PERC,
    ARBIT_ZERO_FEES,
    ETH_RATE,
    klinesDir,
    klinesRootDir,
    tradesRootDir,
} from "../constants";
import { existsSync, writeFileSync } from "node:fs";
import {
    clog,
    getPricePrecision,
    toFixed,
    getSymbol,
    clearTerminal,
    sleep,
    parseDate,
    calcPerc,
    getCoinPrecision,
    getMinAmt,
    getMinSz,
} from "../functions";
import { objStrategies, strategies } from "@cmn/strategies";
import { test_platforms } from "../consts";
import { getInstrus, getKlinesPath, getMakerFee, getTakerFee } from "../funcs3";

import { readJson, ensureDirExists } from "../bend/functions";


enum startAt {
    A,
    B,
    C,
}

export const onCompArbitCointest = async (
    data: IObj,
    client?: Socket,
    io?: Server
) => {
    clearTerminal()
    const ep = "comp-arbit-cointest";
    let {
        plat,
        interval,
        start,
        end,
        demo,
        bal,
        show,
        only,
        join,
        prefix,
        B,
        A: _A,
        save,
        clId,
        offline,
        skip_saved,
        save_klines,
        perc,
        // flipped,
    } = data;

    try {
        console.log("BEGIN TRI COINTEST...");
        client?.emit(ep, "BEGIN COINTEST...");
        prefix = prefix ? `${prefix}_` : "";

        const MAKER = ARBIT_ZERO_FEES ? 0 : getMakerFee(plat),
            TAKER = ARBIT_ZERO_FEES ? 0 : getTakerFee(plat);

        const MIN_PERC = perc ? Number(perc) : ARBIT_MIN_PERC;
        const QUOTE_FEE = 0,
            BASE_FEE = 0;
        const _startAt = startAt.A;
        bal = Number(bal);
        const START_BAL = bal;

        let msg = "";

        let _data: {
            pair: string;
            profit: number;
            trades: number;
            w: number;
            l: number;
        }[] = [];
        let ret_data: IRetData = {ep, clId, data: {}};
        const year = Number(start.split("-")[0]);

        const A = _A ?? "USDT";

        const savename = `COMP_${MIN_PERC}%_${prefix}${B}-${A}_${interval}m`;
        const savePath = `_data/rf/arbit-tri/comp/coins/${plat}/${year}/${savename}.json`;

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

        const _save = () => {
            if (save) {
                ensureDirExists(savePath);
                writeFileSync(savePath, JSON.stringify(_data));
                console.log("SAVED");
            }
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
        if (save) ensureDirExists(savePath);

        let instrus = getInstrus(plat).sort();

        let instrusWithBQuote = instrus.filter((el) => el[1] == B);
        if (only) {
            instrusWithBQuote = instrusWithBQuote.filter((el) => el[0] == only);
        }
        if (!instrusWithBQuote.length) {
            msg = only
                ? `${only}-${B} NOT ON ${plat}`
                : `NO SYMBOLS WITH QUOTE: ${B}`;
            client?.emit(ep, { err: msg });
            return;
        }

        const Plat = new test_platforms[plat]({ demo });

        for (let instru of instrusWithBQuote) {
            try {
                // RESET BALANCE
                bal = START_BAL;
                let w = 0,
                    l = 0;

                let orders: {
                    ts: string;
                    side: string[];
                    px: string[];
                    amt: string[];
                    perc: number;
                    est_perc: number;
                }[] = [];
                let trades = 0,
                    gains: number[] = [];
                const C = instru[0];

                const pairA = [B, A],
                    pairB = [C, B],
                    pairC = [C, A];

                const pxPrA = getPricePrecision(pairA, plat);
                const basePrA = getCoinPrecision(pairA, "limit", plat);

                const pxPrB = getPricePrecision(pairB, plat);
                const basePrB = getCoinPrecision(pairB, "limit", plat);

                const pxPrC = getPricePrecision(pairC, plat);
                const basePrC = getCoinPrecision(pairC, "limit", plat);

                const minAmtA = getMinAmt(pairA, plat),
                    minSzA = getMinSz(pairA, plat);
                const minAmtB = getMinAmt(pairB, plat),
                    minSzB = getMinSz(pairB, plat);
                const minAmtC = getMinAmt(pairC, plat),
                    minSzC = getMinSz(pairC, plat);

                if (
                    pxPrA == null ||
                    basePrA == null ||
                    pxPrB == null ||
                    basePrB == null ||
                    pxPrC == null ||
                    basePrC == null ||
                    minAmtA == null ||
                    minSzA == null ||
                    minAmtB == null ||
                    minSzB == null ||
                    minAmtC == null ||
                    minSzC == null
                ) {
                    msg = "CAN'T FIND PRECISION FOR ONE OF THE PAIRS";
                    console.log(msg);
                    client?.emit(ep, { err: msg });
                    continue;
                }
                console.log("BEGIN PAIR:", pairB, "\n");
                client?.emit(ep, `BEGIN PAIR: ${pairB}`);
                console.log({ pairA, pairB, pairC });
                console.log(
                    { minAmtA, minSzA, minAmtB, minSzB, minAmtC, minSzC },
                    "\n"
                );

                const klinesPathA = getKlinesPath({
                    plat,
                    interval,
                    year,
                    pair: pairA,
                    demo,
                });
                const klinesPathB = getKlinesPath({
                    plat,
                    interval,
                    year,
                    pair: pairB!,
                    demo,
                });
                const klinesPathC = getKlinesPath({
                    plat,
                    interval,
                    year,
                    pair: pairC!,
                    demo,
                });

                if (offline && !existsSync(klinesPathA)) {
                    msg = `${klinesPathA} DOES NOT EXIST`;
                    client?.emit(ep, { err: msg });
                    console.log(msg);
                    continue;
                }
                if (offline && !existsSync(klinesPathB)) {
                    msg = `${klinesPathB} DOES NOT EXIST`;
                    client?.emit(ep, { err: msg });
                    console.log(msg);
                    continue;
                }
                if (offline && !existsSync(klinesPathC)) {
                    msg = `${klinesPathC} DOES NOT EXIST`;
                    client?.emit(ep, { err: msg });
                    console.log(msg);
                    continue;
                }

                ensureDirExists(klinesPathA);
                ensureDirExists(klinesPathB);
                ensureDirExists(klinesPathC);

                const symboA = getSymbol(pairA, plat);
                const symboB = getSymbol(pairB, plat);
                const symboC = getSymbol(pairC, plat);

                const startTs = Date.parse(start);
                const endTs = Date.parse(end);

                const ksA =
                    offline || (skip_saved && existsSync(klinesPathA))
                        ? await readJson(klinesPathA)
                        : await Plat.getKlines({
                              start: startTs,
                              end: endTs,
                              symbol: symboA,
                              interval,
                              savePath: save_klines ? klinesPathA : undefined,
                          });
                const ksB =
                    offline || (skip_saved && existsSync(klinesPathB))
                        ? await readJson(klinesPathB)
                        : await Plat.getKlines({
                              start: startTs,
                              end: endTs,
                              symbol: symboB,
                              interval,
                              savePath: save_klines ? klinesPathB : undefined,
                          });
                const ksC =
                    offline || (skip_saved && existsSync(klinesPathC))
                        ? await readJson(klinesPathC)
                        : await Plat.getKlines({
                              start: startTs,
                              end: endTs,
                              symbol: symboC,
                              interval,
                              savePath: save_klines ? klinesPathC : undefined,
                          });

                if (!ksA) {
                    msg = `FAILED TO GET KLINES FOR ${pairA}`;
                    client?.emit(ep, { err: msg });
                    console.log(msg);
                    continue;
                }
                if (!ksB) {
                    msg = `FAILED TO GET KLINES FOR ${pairB}`;
                    client?.emit(ep, { err: msg });
                    console.log(msg);
                    continue;
                }
                if (!ksC) {
                    msg = `FAILED TO GET KLINES FOR ${pairC}`;
                    client?.emit(ep, { err: msg });
                    console.log(msg);
                    continue;
                }

                let dfA = parseKlines(ksA);
                let dfB = parseKlines(ksB);
                let dfC = parseKlines(ksC);

                const startMs = Date.parse(start);
                const endMs = Date.parse(end);
                console.log({ a: dfA.length, b: dfB.length, c: dfC.length });
                dfA = dfA.filter((el) => {
                    const tsMs = Date.parse(el.ts);
                    return tsMs >= startMs && tsMs <= endMs;
                });

                dfB = dfB.filter((el) => {
                    const tsMs = Date.parse(el.ts);
                    return tsMs >= startMs && tsMs <= endMs;
                });
                dfC = dfC.filter((el) => {
                    const tsMs = Date.parse(el.ts);
                    return tsMs >= startMs && tsMs <= endMs;
                });
                console.log({ a: dfA.length, b: dfB.length, c: dfC.length });

                const realStartMs = Math.max(
                    Date.parse(dfA[0].ts),
                    Date.parse(dfB[0].ts),
                    Date.parse(dfC[0].ts)
                );

                dfA = dfA.filter((el) => {
                    const tsMs = Date.parse(el.ts);
                    return tsMs >= realStartMs;
                });

                dfB = dfB.filter((el) => {
                    const tsMs = Date.parse(el.ts);
                    return tsMs >= realStartMs;
                });
                dfC = dfC.filter((el) => {
                    const tsMs = Date.parse(el.ts);
                    return tsMs >= realStartMs;
                });

                const iLen = Math.min(dfA.length, dfB.length, dfC.length);
                const SLIP = 1; // 0.5;

                let pos = false, entryLimit: number | null = null, exitLimit: number | null = null;
                let base = 0, est_perc = 0, entry =0, exit = 0;

                // Set params to the desired pair [i.e pairC]
                const pair = pairC, basePr = basePrC, pxPr = pxPrC;

                const _fillBuy = ({px, amt, row} : {row: ICandle; px: number; amt:number}) =>{
                    console.log('\nFill buy order\n');
                    bal -= amt;
                    base = (amt / px) * (1 - TAKER)
                    base = toFixed(base, basePr)
                    entryLimit = null;
                    entry = px

                    if (only){
                        orders.push({
                            ts: row.ts,
                            perc: 0,
                            est_perc: 0,
                            side: [
                                `[${pair}] BUY {H: ${row.h}, L: ${
                                    row.l
                                }, V: ${row.v || "null"}}`,
                            ],
                            px: [
                                `${pair[1]} ${px}`,
                            ],
                            amt: [
                                `${pair[0]} ${base}`,
                            ],
                        })
                    }
                }
                const _fillSell = ({px, amt, row} : {row: ICandle; px: number; amt:number}) =>{
                    console.log('\nFill sell order\n');
                    base -= amt;
                    bal = px * amt * (1 - MAKER)
                    bal = toFixed(bal, pxPr)
                    entryLimit = null;
                    exitLimit = null;
                    pos= false
                    trades += 1;
                    console.log({entry, px});
                    const perc = calcPerc(entry, px)

                    if (only){
                        orders.push({
                            ts: row.ts,
                            perc,
                            est_perc,
                            side: [
                                `[${pair}] SELL {H: ${row.h}, L: ${
                                    row.l
                                }, V: ${row.v || "null"}}`,
                            ],
                            px: [
                                `${pair[1]} ${px}`,
                            ],
                            amt: [
                                `${pair[1]} ${bal}`,
                            ],
                        })
                    }
                }
                for (let i = 1; i < iLen; i++) {
                    try {
                        const prev_rowA = dfA[i - 1];
                        const prev_rowB = dfB[i - 1];
                        const prev_rowC = dfC[i - 1];

                        const rowA = dfA[i];
                        const rowB = dfB[i];
                        const rowC = dfC[i];

                        const pxA = rowA.o;
                        const pxB = rowB.o;
                        const pxC = rowC.o;

                        const oPxA = prev_rowA.o;
                        const oPxB = prev_rowB.o;
                        const oPxC = prev_rowC.o;

                        const cPxA = prev_rowA.h;
                        const cPxB = prev_rowB.c;
                        const cPxC = prev_rowC.c;
                        const ts = rowA.ts;


                        if (rowB.ts != ts || rowC.ts != ts) {
                            msg = "TIMESTAMPS DONT MATCH";
                            client?.emit(ep, { err: msg });
                            continue; //TODO return;
                        }
                        console.log("\n", { ts });
                        console.log({ pairA, pairB, pairC });

                
                        const _amt = 1;
                        // Set params to desired pair
                        const prev_row = prev_rowC,
                        row = rowC
                        function calcExitLimit(){
                            const CONST = .5
                            exitLimit = prev_row.c * (1 + CONST/100);
                            return exitLimit
                        }
                        function calcEntryLimit(){
                            const CONST = .04
                            entryLimit = prev_row.c * (1 - CONST/100);
                            return entryLimit
                        }
                        if (pos){
                            if (entryLimit){
                                // Buy order placed
                                console.log('Has buy order...');
                                if (prev_row.l <= entryLimit){
                                    _fillBuy({px: entryLimit, row: prev_row, amt: bal})
                                    continue
                                }
                                
                            }

                            if (exitLimit && !entryLimit){
                                // Sell order placed
                                console.log('Has sell order...');
                                const SL = 2
                                const _sl = entry * (1 - SL/100)
                                if (prev_row.h >= exitLimit && prev_row.l >= _sl){
                                    _fillSell({px: exitLimit, row: prev_row, amt: base})
                                    continue
                                }
                                
                            }

                            // Re-adjust prices
                            console.log(`\nRe-adjusting prices\n`);
                            if (entryLimit) calcEntryLimit();
                            if (exitLimit) calcExitLimit();
                            
                            continue
                        }

                        const _A2 = pxC / (pxA * pxB);
                        const _perc = calcPerc(_amt, _A2);

                        const _isGreenA = prev_rowA.c >= prev_rowA.o;
                        const _isGreenB = prev_rowB.c >= prev_rowB.o;
                        const _isGreenC = prev_rowC.c >= prev_rowC.o;
                        const mustEnter =
                            (!_isGreenA && _isGreenC) || _isGreenB;

                        console.log({ prev_ts: prev_rowA.ts });
                        console.log({ pxA, pxB, pxC });
                        console.log({ _A2 });

                        console.log({ _perc, MIN_PERC }, "\n");
                        perc = Math.max(_perc);
                        const percCond = perc >= MIN_PERC; // o_perc >= MIN_PERC && c_perc >= MIN_PERC
                        est_perc = perc;


                        if (percCond) {
                            /**
                             * Place limit buy order at prev close
                             * Set exit limit at {perc} above prev close
                             */
                            console.log({ perc: `${perc}%` });
                            calcEntryLimit();
                            calcExitLimit();
                            pos = true;
                            continue
                            
                            /* console.log({ A, B, C });
                            console.log("GOING IN...\n");

                            
                                baseA = bal / pxA;
                                if (baseA < minSzA || bal < minAmtA) {
                                    console.log(
                                        "CANNOT BUY A: LESS THAN MIN_AMT",
                                        {
                                            baseA,
                                            minSzA,
                                            amtA: bal,
                                            minAmtA,
                                        }
                                    );
                                    continue;
                                }
                                baseA *= 1 - slipA;
                                baseA *= 1 - TAKER;
                                baseA = toFixed(baseA, basePrA);

                                baseB = baseA / pxB;
                                if (baseB < minSzB || baseA < minAmtB) {
                                    console.log(
                                        "CANNOT BUY B: LESS THAN MIN_AMT",
                                        {
                                            baseB,
                                            minSzB,
                                            amtB: baseA,
                                            minAmtB,
                                        }
                                    );
                                    continue;
                                }
                                baseB *= 1 - slipB;
                                baseB *= 1 - TAKER;
                                baseB = toFixed(baseB, basePrB);

                                _quote = baseB * pxC;
                                if (baseB < minSzC || _quote < minAmtC) {
                                    console.log(
                                        "CANNOT BUY B: LESS THAN MIN_AMT",
                                        {
                                            baseC: baseB,
                                            minSzC,
                                            amtC: _quote,
                                            minAmtC,
                                        }
                                    );
                                    continue;
                                }
                                _quote *= 1 - slipC;
                                _quote *= 1 - MAKER;
                                _quote = toFixed(_quote, pxPrC);
                            

                            if (_quote >= bal) w += 1;
                            else l += 1;
                            perc = Number(
                                (((_quote - bal) / bal) * 100).toFixed(2)
                            );
                            bal = _quote;
                            console.log({ bal, START_BAL });

                            if (only) {
                                
                                    orders.push({
                                        ts,
                                        perc,
                                        est_perc,
                                        side: [
                                            `[${pairA}] BUY {H: ${rowA.h}, L: ${
                                                rowA.l
                                            }, V: ${rowA.v || "null"}}`,
                                            `[${pairB}] BUY {H: ${rowB.h}, L: ${
                                                rowB.l
                                            }, V: ${rowB.v || "null"}}`,
                                            `[${pairC}] SELL {H: ${
                                                rowC.h
                                            }, L: ${rowC.l}, V: ${
                                                rowC.v || "null"
                                            }}`,
                                        ],
                                        px: [
                                            `${pairA[1]} ${cPxA}\n${pairA[1]} ${pxA}`,
                                            `${pairB[1]} ${cPxB}\n${pairB[1]} ${pxB}`,
                                            `${pairC[1]} ${cPxC}\n${pairC[1]} ${pxC}`,
                                        ],
                                        amt: [
                                            `${pairA[0]} ${baseA}`,
                                            `${pairB[0]} ${baseB}`,
                                            `${pairC[1]} ${_quote}`,
                                        ],
                                    });
                                
                            }
                            trades += 1; */
                        }
                        gains.push(perc);
                    } catch (e) {
                        console.log(e);
                        continue;
                    }
                }
                console.log("\nPAIR:", pairB, "DONE");
                client?.emit(ep, `PAIR: ${pairB} DONE`);
                // FOR EACH PAIR SET
                const profit = toFixed(bal - START_BAL, 2);
                console.log({ profit });
                const symbo = getSymbol([C, B], "okx");
                _data.push({ pair: symbo, profit, trades, w, l });
                parseData(orders);
                _save();
            } catch (e) {
                console.log(e);
                continue;
            }
        }

        parseData();
        _save();
        client?.emit(ep, ret_data);
        console.log("\nALL DONE");
        return ret_data;
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};
