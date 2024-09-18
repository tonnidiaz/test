import { Socket } from "socket.io";
import { Server } from "ws";
import { IObj } from "../interfaces";
import { ARBIT_ZERO_FEES, ARBIT_MIN_PERC } from "../constants";
import { getInstrus, getKlinesPath, getMakerFee, getTakerFee } from "../funcs3";
import { ensureDirExists } from "../orders/funcs";
import {
    getCoinPrecision,
    getMinAmt,
    getMinSz,
    getPricePrecision,
    getSymbol,
    readJson,
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

        const savename = `${perc}%_${prefix}${B}-${A}_${interval}m`;
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
                let entryLimit: number | undefined;
                let entryLimit2: number | undefined;
                let exitLimit: number | undefined;
                let exitLimit2: number | undefined;
                let pos = false;
                let _base = 0;
                let _quote = 0,
                    baseA = 0,
                    baseB = 0;
                let perc = 0,
                    est_perc = 0;
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

                        const _amt = 1;

                        let oA = 0,
                            cA = 0,
                            oB = 0,
                            cB = 0,
                            oC = 0,
                            cC = 0;

                        if (pos) {
                            console.log("\nHAS POS\n");
                            if (flipped) {
                                if (entryLimit) {
                                    //BUY AT C
                                    console.log("BUYING AT C");
                                    if (rowC.l <= entryLimit) {
                                        console.log("BOUGHT AT C");
                                        _base = bal / entryLimit;
                                        entryLimit = undefined;
                                    } else {
                                        console.log(
                                            "COULD NOT BUY",
                                            { rowC },
                                            "\n"
                                        );
                                        //pos = false
                                    }
                                } else if (exitLimit) {
                                    //SELL AT B
                                    console.log("SELLING AT B");
                                    if (rowB.h >= exitLimit) {
                                        _base = _base * exitLimit;
                                        exitLimit = undefined;
                                        console.log("SOLD AT B");
                                    }
                                } else if (exitLimit2) {
                                    //SELL AT A
                                    console.log("SELLING AT A");
                                    if (rowA.h >= exitLimit2) {
                                        console.log("SOLD AT A");
                                        _quote = _base * exitLimit2;
                                        exitLimit2 = undefined;
                                        pos = false;
                                        bal = _quote;
                                        console.log({bal})
                                    }
                                }
                            } else {
                                if (entryLimit) {
                                    //BUY AT A
                                    console.log("BUYING AT A");
                                    if (rowA.l <= entryLimit) {
                                        console.log("BOUGHT AT A");
                                        _base = bal / entryLimit;
                                        entryLimit = undefined;
                                    } else {
                                        console.log(
                                            "COULD NOT BUY",
                                            { rowA },
                                            "\n"
                                        );
                                        //pos = false
                                    }
                                } else if (entryLimit2) {
                                    //BUY AT B
                                    console.log("BUYING AT B");
                                    if (rowB.l <= entryLimit2) {
                                        console.log("BOUGHT AT B");
                                        _base = _base / entryLimit2;
                                        entryLimit2 = undefined;
                                    }
                                } else if (exitLimit) {
                                    //SELL AT C
                                    console.log("SELLING AT C", {_base, bal});
                                    if (rowC.h >= exitLimit) {
                                        console.log("SOLD AT C");
                                        _quote = _base * exitLimit;
                                        exitLimit = undefined;
                                        pos = false;
                                        bal = _quote;
                                        console.log({bal})
                                    }
                                }
                            }
                        }

                        if (flipped) {
                            oC = _amt / oPxC;
                            oB = oC * oPxB;
                            oA = oB * oPxA;

                            cC = _amt / cPxC;
                            cB = cC * cPxB;
                            cA = cB * cPxA;
                        } else {
                            cB = _amt / cPxA; //  BUY B WITH A
                            cC = cB / cPxB; // BUY C WITH B
                            cA = cC * cPxC; // SELL C FOR A

                            oB = _amt / oPxA; //  BUY B WITH A
                            oC = oB / oPxB; // BUY C WITH B
                            oA = oC * oPxC; // SELL C FOR A
                            // 242.660

                            //console.log({ _amt, _A, perc });
                        }
                        const o_perc = Number(
                            (((oA - _amt) / _amt) * 100).toFixed(2)
                        );
                        const c_perc = Number(
                            (((cA - _amt) / _amt) * 100).toFixed(2)
                        );

                        const _isGreenA = prev_rowA.c >= prev_rowA.o;
                        const _isGreenB = prev_rowB.c >= prev_rowB.o;
                        const _isGreenC = prev_rowC.c >= prev_rowC.o;
                        const mustEnter =
                            (!_isGreenA && _isGreenC) || _isGreenB;

                        console.log({ prev_ts: prev_rowA.ts });
                        console.log({ cPxA, cPxB, cPxC });
                        console.log({ pxA, pxB, pxC });

                        console.log({ _isGreenA, _isGreenB, _isGreenC });
                        console.log({ o_perc, c_perc, mustEnter }, "\n");
                        const percCond = Math.abs(c_perc) >= MIN_PERC; // o_perc >= MIN_PERC && c_perc >= MIN_PERC

                        if (pos) {
                            if (flipped) {
                                if (entryLimit) {
                                    entryLimit = rowC.o;
                                } else if (exitLimit) {
                                    exitLimit = rowB.o;
                                } else if (exitLimit2) {
                                    exitLimit2 = rowA.o;
                                }
                            } else {
                                if (entryLimit) {
                                    entryLimit = rowA.o;
                                } else if (entryLimit2) {
                                    entryLimit2 = rowB.o;
                                } else if (exitLimit) {
                                    exitLimit = rowC.o;
                                }
                            }
                            continue;
                        }
                        flipped = c_perc < 0; //(cPxA * cPxB) > cPxC

                        ///const noZeroVol = prev_rowA.v != 0 && prev_rowB.v != 0 && prev_rowC.v != 0

                        const SLIP = 0.5; //0.5;
                        const slipA = rowA.v == 0 ? SLIP / 100 : 0;
                        const slipB = rowB.v == 0 ? SLIP / 100 : 0;
                        const slipC = rowC.v == 0 ? SLIP / 100 : 0;

                        const day = new Date(rowA.ts).getDay();
                        const is_weekend = day == 6 || day == 7;

                        if (percCond && !pos) {
                            //console.log({ perc: `${perc}%` });
                            console.log({ A, B, C });
                            console.log("GOING IN...\n");
                            pos = true;
                            est_perc = Math.abs(c_perc);
                            if (flipped) {
                                // Buy ALGO at C
                                entryLimit = pxC;
                                exitLimit = pxB;
                                exitLimit2 = pxA;
                            } else {
                                entryLimit = pxA;
                                entryLimit2 = pxB;
                                exitLimit = pxC;
                            }
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
