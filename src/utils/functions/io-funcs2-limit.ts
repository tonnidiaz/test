import { Socket } from "socket.io";
import { Server } from "ws";
import { IObj } from "../interfaces";
import { ARBIT_ZERO_FEES, ARBIT_MIN_PERC } from "../constants";
import { getInstrus, getKlinesPath, getMakerFee, getTakerFee } from "../funcs3";
import { ensureDirExists } from "../orders/funcs";
import {
    calcPerc,
    ceil,
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
                    ts?: string[];
                    side?: string[];
                    px?: string[];
                    amt?: string[];
                    perc?: number;
                    est_perc?: number;
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

                let _basePair = ["", ""];
                let flipped = false; //(cPxA * cPxB) > cPxC
                let opxA = 0,
                    opxB = 0,
                    opxC = 0;
                let trade: {
                    ts?: string[];
                    perc?: number;
                    est_perc?: number;
                    side?: string[];
                    px?: string[];
                    amt?: string[];
                } = {};

                const closePos = () => {
                    trades += 1;
                    if (perc >= 0) {
                        w += 1;
                    } else {
                        l += 1;
                    }
                    entryLimit = undefined;
                    entryLimit2 = undefined;
                    exitLimit = undefined;
                    exitLimit2 = undefined;
                    pos = false;
                    _base = 0;
                    _quote = 0;
                    orders.push(trade);
                    trade = {};
                };
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

                        opxA = rowA.o;
                        opxB = rowB.o;
                        opxC = rowC.o;
                        if (rowB.ts != ts || rowC.ts != ts) {
                            msg = "TIMESTAMPS DONT MATCH";
                            client?.emit(ep, { err: msg });
                            continue; //TODO return;
                        }
                        console.log("\n", { ts });
                        console.log({ pairA, pairB, pairC });

                        const A = 1;

                        if (pos) {
                            console.log("\nHAS POS\n");
                            console.log({
                                flipped,
                                entryLimit,
                                entryLimit2,
                                exitLimit,
                                exitLimit2,
                            });
                            if (flipped) {
                                console.log("FLIPPED");
                                if (entryLimit) {
                                    //BUY AT C
                                    console.log("BUYING AT C");
                                    if (prev_rowC.l < entryLimit) {
                                        console.log("BOUGHT AT C");
                                        _base = bal / entryLimit;
                                        _base = toFixed(
                                            _base * (1 - TAKER),
                                            basePrC
                                        );
                                        _basePair = pairB;

                                        trade = {
                                            ts: [prev_rowC.ts],
                                            est_perc,
                                            side: [
                                                `[${pairC}] BUY {H: ${
                                                    prev_rowC.h
                                                }, L: ${prev_rowC.l}, V: ${
                                                    prev_rowC.v || "null"
                                                }}`,
                                            ],
                                            px: [`${pairC[1]} ${entryLimit}`],
                                            amt: [`${pairC[0]} ${_base}`],
                                        };
                                        entryLimit = undefined;
                                    } else {
                                        console.log(
                                            "COULD NOT BUY",
                                            { prev_rowC, entryLimit },
                                            "\n"
                                        );
                                    }
                                } else if (exitLimit) {
                                    //SELL AT B
                                    console.log("SELLING AT B");
                                    if (prev_rowB.h > exitLimit) {
                                        _base = _base * exitLimit;
                                        _base = toFixed(
                                            _base * (1 - MAKER),
                                            pxPrB
                                        );
                                        _basePair = pairA;

                                        trade.ts?.push(prev_rowB.ts);
                                        trade.side?.push(
                                            `[${pairB}] SELL {H: ${
                                                prev_rowB.h
                                            }, L: ${prev_rowB.l}, V: ${
                                                prev_rowB.v || "null"
                                            }}`
                                        );
                                        trade.px?.push(
                                            `${pairB[1]} ${exitLimit}`
                                        );
                                        trade.amt?.push(`${pairB[1]} ${_base}`);
                                        exitLimit = undefined;
                                        console.log("SOLD AT B");
                                    }
                                } else if (exitLimit2) {
                                    //SELL AT A
                                    console.log("SELLING AT A");
                                    if (prev_rowA.h > exitLimit2) {
                                        console.log("SOLD AT A");
                                        _quote = _base * exitLimit2;
                                        _quote = toFixed(
                                            _quote * (1 - MAKER),
                                            pxPrA
                                        );
                                        perc = ceil(
                                            ((_quote - bal) / bal) * 100,
                                            2
                                        );

                                        trade.ts?.push(prev_rowA.ts);
                                        trade.side?.push(
                                            `[${pairA}] SELL {H: ${
                                                prev_rowA.h
                                            }, L: ${prev_rowA.l}, V: ${
                                                prev_rowA.v || "null"
                                            }}`
                                        );
                                        trade.px?.push(
                                            `${pairA[1]} ${exitLimit2}`
                                        );
                                        trade.amt?.push(
                                            `${pairA[1]} ${_quote}`
                                        );
                                        trade.perc = perc;

                                        exitLimit2 = undefined;
                                        bal = _quote;
                                        console.log({ bal });
                                        closePos();
                                    }
                                }
                            } else {
                                console.log("NORMAL");
                                if (entryLimit) {
                                    //BUY AT A
                                    console.log("BUYING AT A");
                                    if (prev_rowA.l < entryLimit) {
                                        console.log("BOUGHT AT A");
                                        _base = bal / entryLimit;
                                        _base = toFixed(
                                            _base * (1 - TAKER),
                                            basePrA
                                        );

                                        _basePair = pairB;
                                        trade = {
                                            ts: [prev_rowA.ts],
                                            est_perc,
                                            side: [
                                                `[${pairA}] BUY {H: ${
                                                    prev_rowA.h
                                                }, L: ${prev_rowA.l}, V: ${
                                                    prev_rowA.v || "null"
                                                }}`,
                                            ],
                                            px: [`${pairA[1]} ${entryLimit}`],
                                            amt: [`${pairA[0]} ${_base}`],
                                        };
                                        entryLimit = undefined;
                                    } else {
                                        console.log(
                                            "COULD NOT BUY",
                                            { prev_rowA, entryLimit },
                                            "\n"
                                        );
                                    }
                                } else if (entryLimit2) {
                                    //BUY AT B
                                    console.log("BUYING AT B");
                                    if (prev_rowB.l < entryLimit2) {
                                        console.log("BOUGHT AT B");
                                        _base = _base / entryLimit2;
                                        _base = toFixed(
                                            _base * (1 - TAKER),
                                            basePrB
                                        );

                                        _basePair = pairC;

                                        trade.ts?.push(prev_rowB.ts);
                                        trade.side?.push(
                                            `[${pairB}] BUY {H: ${
                                                prev_rowB.h
                                            }, L: ${prev_rowB.l}, V: ${
                                                prev_rowB.v || "null"
                                            }}`
                                        );
                                        trade.px?.push(
                                            `${pairB[1]} ${entryLimit2}`
                                        );
                                        trade.amt?.push(`${pairB[1]} ${_base}`);

                                        entryLimit2 = undefined;
                                    }
                                } else if (exitLimit) {
                                    //SELL AT C
                                    console.log("SELLING AT C", { _base, bal });
                                    if (prev_rowC.h > exitLimit) {
                                        console.log("SOLD AT C");
                                        _quote = _base * exitLimit;
                                        _quote = toFixed(
                                            _quote * (1 - MAKER),
                                            basePrC
                                        );

                                        perc = ceil(
                                            ((_quote - bal) / bal) * 100,
                                            2
                                        );
                                        trade.ts?.push(prev_rowC.ts);
                                        trade.side?.push(
                                            `[${pairC}] SELL {H: ${
                                                prev_rowC.h
                                            }, L: ${prev_rowC.l}, V: ${
                                                prev_rowC.v || "null"
                                            }}`
                                        );
                                        trade.px?.push(
                                            `${pairC[1]} ${exitLimit}`
                                        );
                                        trade.amt?.push(
                                            `${pairC[1]} ${_quote}`
                                        );
                                        trade.perc = perc;

                                        exitLimit = undefined;
                                        bal = _quote;
                                        console.log({ bal });
                                        closePos();
                                    }
                                }
                            }
                        }

                        console.log({ prev_ts: prev_rowA.ts });

                        const B_CONST = /* B == 'USDC' ? 0 : */ 0//1.5;
                        const A_CONST = B == "USDC" ? 0 : 0//1.5;
                        const C_CONST = 0//.5;
                        const ocMaxA = Math.max(prev_rowA.o, prev_rowA.c)
                        const ocMaxC = Math.max(prev_rowC.o, prev_rowC.c)

                        const MAX_PERC = 1.5
                        if (pos) {
                            
                            if (flipped) {
                                if (entryLimit) {
                                    const _entryLimit = toFixed(
                                        prev_rowC.c * (1 - C_CONST / 100),
                                        pxPrC
                                    );
                                    if (calcPerc(entryLimit, _entryLimit) <= MAX_PERC){
                                        entryLimit = _entryLimit
                                    }
                                } else if (exitLimit) {
                                    const _exitLimit = toFixed(
                                        prev_rowB.c * (1 + B_CONST / 100),
                                        pxPrB
                                    );
                                    if (calcPerc(_exitLimit, exitLimit) <= MAX_PERC){
                                        exitLimit = _exitLimit
                                    }
                                } else if (exitLimit2) {
                                    const _exitLimit2 = toFixed(
                                        ocMaxA * (1 + A_CONST / 100),
                                        pxPrA
                                    );
                                    if (calcPerc(_exitLimit2, exitLimit2) <= MAX_PERC){
                                        exitLimit2 = _exitLimit2
                                    }
                                }
                            } else {
                                if (entryLimit) {
                                    const _entryLimit = toFixed(
                                        prev_rowA.c * (1 - A_CONST / 100),
                                        pxPrA
                                    );
                                    if (calcPerc(entryLimit, _entryLimit) <= MAX_PERC){
                                        entryLimit = _entryLimit
                                    }
                                } else if (entryLimit2) {
                                    const _entryLimit2 = toFixed(
                                        prev_rowB.c * (1 - B_CONST / 100),
                                        pxPrB
                                    );
                                    if (calcPerc(entryLimit2, _entryLimit2) <= MAX_PERC){
                                        entryLimit2 = _entryLimit2
                                    }
                                } else if (exitLimit) {
                                    const _exitLimit = toFixed(
                                        ocMaxC * (1 + C_CONST / 100),
                                        pxPrC
                                    );
                                    if (calcPerc(_exitLimit, exitLimit) <= MAX_PERC){
                                        exitLimit = _exitLimit
                                    }
                                }
                            }
                            continue;
                        }

                        const _pxA = cPxA
                        const _pxB = cPxB
                        const _pxC = cPxC
                        const _A2 = (A * _pxC) / (_pxA * _pxB)
                        const _perc = ceil((_A2 - A)/A * 100, 2)

                        const _fpxA = cPxA
                        const _fpxB = cPxB
                        const _fpxC = cPxC
                        const _fA2 = (A * _fpxA * _fpxB) / _fpxC

                        const _fperc = ceil((_fA2 - A)/A * 100, 2)

                        flipped = _fperc > _perc
                        console.log({pxA, pxB, pxC})
                        
                        console.log({flipped, _perc, _fperc})
                        console.log({A, _A2, _fA2})
                        perc = Math.max(_perc, _fperc)
                        est_perc = perc
                        const __pxA = flipped ? _fpxA : _pxA
                        const __pxB = flipped ? _fpxB : _pxB
                        const __pxC = flipped ? _fpxC : _pxC

                   const SLIP = 0.5; //0.5;
                        const slipA = rowA.v == 0 ? SLIP / 100 : 0;
                        const slipB = rowB.v == 0 ? SLIP / 100 : 0;
                        const slipC = rowC.v == 0 ? SLIP / 100 : 0;

                        const day = new Date(rowA.ts).getDay();
                        const is_weekend = day == 6 || day == 7;
                        const volCond =
                            prev_rowA.v > 0 &&
                            prev_rowB.v > 0 &&
                            prev_rowC.v > 0;

                        const percCond = est_perc >= MIN_PERC
                        if (percCond && !pos) {
                            //console.log({ perc: `${perc}%` });
                            console.log({ A, B, C });
                            console.log("GOING IN...\n");
                            pos = true;
                            //  bal = 0
                            if (flipped) {
                                // Buy ALGO at C
                                entryLimit = cPxC * (1 - C_CONST / 100);
                                exitLimit = cPxB * (1 + B_CONST / 100);
                                exitLimit2 = ocMaxA * (1 + A_CONST / 100);
                            } else {
                                entryLimit = cPxA * (1 - A_CONST / 100);
                                entryLimit2 = cPxB * (1 - B_CONST / 100);
                                exitLimit = ocMaxC * (1 + C_CONST / 100);
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

                console.log({ bal });
                if (_base) {
                    const px =
                        _basePair == pairA
                            ? opxA
                            : _basePair == pairB
                            ? opxB
                            : opxC;
                    if (flipped) {
                        //bal = _base * px * (1 - TAKER);
                    } else {
                    }

                    console.log("\nSELLING AT LAST\n", {
                        _base,
                        px,
                        _basePair,
                    });
                }
                const profit = toFixed(bal - START_BAL, 2);
                console.log({ profit, trades, _base, _basePair, _quote });
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
