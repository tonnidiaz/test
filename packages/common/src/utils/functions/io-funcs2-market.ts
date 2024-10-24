import { Socket } from "socket.io";
import { Server } from "ws";
import { IObj } from "../interfaces";
import { ARBIT_ZERO_FEES, ARBIT_MIN_PERC } from "../constants";
import { getInstrus, getKlinesPath, getMakerFee, getTakerFee } from "../funcs3";
import { readJson, ensureDirExists } from "@cmn/utils/bend/functions";
import {
    calcPerc,
    getCoinPrecision,
    getMinAmt,
    getMinSz,
    getPricePrecision,
    getSymbol,
    toFixed,
} from "../functions";
import { existsSync, writeFileSync } from "fs";
import { parseKlines } from "../funcs2";
import { test_platforms } from "../consts";

enum startAt {
    A,
    B,
    C,
}

export const onTriArbitCointest = async (
    data: IObj,
    client?: Socket,
    io?: Server
) => {
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
        ep,
        save,
        clId,
        offline,
        skip_saved,
        save_klines,
        perc,
        // flipped,
    } = data;

    try {
        console.log("BEGIN COINTEST...\n");
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
        let ret_data: IObj = {};
        const year = Number(start.split("-")[0]);

        const A = _A ?? "USDT";

        const savename = `${MIN_PERC}%_${prefix}${B}-${A}_${interval}m`;
        const savePath = `_data/rf/arbit-tri/coins/${plat}/${year}/${savename}.json`;

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
                return client?.emit(ep, { err: savePath + " DOES TO EXIST" });
            }
            _data = await readJson(savePath);
            client?.emit(ep, parseData());
            return _data;
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

                        let flipped = false; //(cPxA * cPxB) > cPxC

                        if (rowB.ts != ts || rowC.ts != ts) {
                            msg = "TIMESTAMPS DONT MATCH";
                            client?.emit(ep, { err: msg });
                            continue; //TODO return;
                        }
                        console.log("\n", { ts });
                        console.log({ pairA, pairB, pairC });

                        let _quote = 0,
                            baseA = 0,
                            baseB = 0;
                        let perc = 0;
                        const _amt = 1;

                        let oA = 0,
                            cA = 0,
                            oB = 0,
                            cB = 0,
                            oC = 0,
                            cC = 0;

                        const _A2 = pxC / (pxA * pxB);
                        const _fA2 = (pxA * pxB) / pxC;
                        const _perc = calcPerc(_amt, _A2);
                        const _fperc = calcPerc(_amt, _fA2);

                        const _isGreenA = prev_rowA.c >= prev_rowA.o;
                        const _isGreenB = prev_rowB.c >= prev_rowB.o;
                        const _isGreenC = prev_rowC.c >= prev_rowC.o;
                        const mustEnter =
                            (!_isGreenA && _isGreenC) || _isGreenB;

                        console.log({ prev_ts: prev_rowA.ts });
                        console.log({ pxA, pxB, pxC });
                        console.log({ _A2, _fA2 });

                        console.log({ _perc, _fperc, MIN_PERC }, "\n");
                        flipped = _fperc > _perc;
                        perc = Math.max(_fperc, _perc);
                        const percCond = perc >= MIN_PERC; // o_perc >= MIN_PERC && c_perc >= MIN_PERC
                        const est_perc = perc;
                        ///const noZeroVol = prev_rowA.v != 0 && prev_rowB.v != 0 && prev_rowC.v != 0

                        const slipA = 0; // rowA.v == 0 || false ? SLIP / 100 : 0;
                        const slipB = 0; // rowB.v == 0 || false ? SLIP / 100 : 0;
                        const slipC = 0; // rowC.v == 0 || false ? SLIP / 100 : 0;

                        const day = new Date(rowA.ts).getDay();
                        const is_weekend = day == 6 || day == 7;

                        if (percCond) {
                            //console.log({ perc: `${perc}%` });
                            console.log({ A, B, C, flipped });
                            console.log("GOING IN...\n");

                            if (flipped) {
                                // Buy ALGO at C
                                baseB = bal / pxC;
                                if (baseB < minSzC || bal < minAmtC) {
                                    console.log(
                                        "CANNOT BUY C: LESS THAN MIN_AMT",
                                        {
                                            baseC: baseB,
                                            minSzC,
                                            amtC: bal,
                                            minAmtC,
                                        }
                                    );
                                    continue;
                                }
                                baseB *= 1 - slipC;
                                baseB *= 1 - TAKER;
                                baseB = toFixed(baseB, basePrC);

                                // Sell ALGO at B to get BTC
                                baseA = baseB * pxB;
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
                                baseA *= 1 - slipB;
                                baseA *= 1 - MAKER;
                                baseA = toFixed(baseA, pxPrB);

                                // Sell BTC at A to get USDT back
                                // SELL baseA [QUOTE of B] at A to get QUOTE of A
                                _quote = baseA * pxA;
                                if (baseA < minSzA || _quote < minAmtA) {
                                    console.log(
                                        "CANNOT BUY B: LESS THAN MIN_AMT",
                                        {
                                            baseA,
                                            minSzA,
                                            amtA: _quote,
                                            minAmtA,
                                        }
                                    );
                                    continue;
                                }
                                _quote *= 1 - slipA;
                                _quote *= 1 - MAKER;
                                _quote = toFixed(_quote, pxPrA);
                            } else {
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
                            }

                            if (_quote >= bal) w += 1;
                            else l += 1;
                            perc = Number(
                                (((_quote - bal) / bal) * 100).toFixed(2)
                            );
                            bal = _quote;
                            console.log({ bal, START_BAL });

                            

                            if (only) {
                                if (flipped) {
                                    orders.push({
                                        ts,
                                        perc,
                                        est_perc,
                                        side: [
                                            `[${pairC}] BUY {H: ${rowC.h}, L: ${
                                                rowC.l
                                            }, V: ${rowC.v || "null"}}`,
                                            `[${pairB}] SELL {H: ${
                                                rowB.h
                                            }, L: ${rowB.l}, V: ${
                                                rowB.v || "null"
                                            }}`,
                                            `[${pairA}] SELL {H: ${
                                                rowA.h
                                            }, L: ${rowA.l}, V: ${
                                                rowA.v || "null"
                                            }}`,
                                        ],
                                        px: [
                                            `${pairC[1]} ${cPxC}\n${pairC[1]} ${pxC}`,
                                            `${pairB[1]} ${cPxB}\n${pairB[1]} ${pxB}`,
                                            `${pairA[1]} ${cPxA}\n${pairA[1]} ${pxA}`,
                                        ],
                                        amt: [
                                            `${pairC[0]} ${baseB}`,
                                            `${pairB[1]} ${baseA}`,
                                            `${pairA[1]} ${_quote}`,
                                        ],
                                    });
                                } else {
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
                            }
                            trades += 1;
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
