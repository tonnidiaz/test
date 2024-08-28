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
import { platforms } from "../consts";

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
        perc
    } = data;

    try {
        console.log("BEGIN COINTEST...\n");
        client?.emit(ep, "BEGIN COINTEST...");
        prefix = prefix ? `${prefix}_` : "";

        const MAKER = ARBIT_ZERO_FEES ? 0 : getMakerFee(plat),
            TAKER = ARBIT_ZERO_FEES ? 0 : getTakerFee(plat);

            const MIN_PERC = perc ? Number(perc) : ARBIT_MIN_PERC
        const QUOTE_FEE = 0,
            BASE_FEE = 0;

        bal = Number(bal);
        const START_BAL = bal;

        let msg = "";

        let _data: { pair: string; profit: number; trades: number, w: number, l: number }[] = [];
        let ret_data: IObj = {};
        const year = Number(start.split("-")[0]);

        const A = _A ?? "USDT";

        const savePath = `_data/rf/arbit-tri/coins/${plat}/${year}/${prefix}${B}-${A}_${interval}m.json`;

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

        const Plat = new platforms[plat]({ demo });

        for (let instru of instrusWithBQuote) {
            try{
            // RESET BALANCE
            bal = START_BAL;
            let w = 0,
                l = 0;

            let orders: {
                ts: string;
                side: string[];
                px: string[];
                amt: string[];
                perc: number
            }[] = [];
            let trades = 0,
                gains: number[] = [];
            const
                C = instru[0];

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

            ensureDirExists(klinesPathA)
            ensureDirExists(klinesPathB)
            ensureDirExists(klinesPathC)

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
            for (let i = 0; i < iLen; i++) {
                try {
                    const rowA = dfA[i];
                    const rowB = dfB[i];
                    const rowC = dfC[i];

                    const pxA = rowA.o;
                    const pxB = rowB.o;
                    const pxC = rowC.o;
                    const ts = rowA.ts;

                    if (rowB.ts != ts || rowC.ts != ts) {
                        msg = "TIMESTAMPS DONT MATCH";
                        client?.emit(ep, { err: msg });
                       continue//TODO return;
                    }
                    console.log("\n", { ts });
                    console.log({pairA, pairB, pairC})
                    console.log({pxA, pxB, pxC})
                    
                    let _quote = 0,
                        baseA = 0,
                        baseB = 0;
                    let perc = 0;

                    const flipped = false;
                    if (flipped) {
                        const baseC = (bal / rowC.o) * (1 - TAKER);
                        const quoteB = baseC * rowB.o * (1 - MAKER);
                        _quote = quoteB * rowA.o * (1 - MAKER);
                    } else {
                        const _amt = 1;
                        const _B = _amt / pxA; //  BUY B WITH A
                        const _C = _B / pxB; // BUY C WITH B
                        const _A = _C * pxC; // SELL C FOR A
                        // 242.660
                        perc = Number((((_A - _amt) / _amt) * 100).toFixed(2));
                        //console.log({ _amt, _A, perc });
                    }

                    if (perc >= MIN_PERC) {
                        console.log({ perc: `${perc}%` });
                        console.log({ A, B, C });
                        console.log("GOING IN...\n");
                        baseA = bal / rowA.o;
                        if (baseA < minSzA || bal < minAmtA) {
                            console.log("CANNOT BUY A: LESS THAN MIN_AMT", {
                                baseA,
                                minSzA,
                                amtA: bal,
                                minAmtA,
                            });
                            continue;
                        }

                        baseA *= 1 - TAKER;
                        baseA = toFixed(baseA, basePrA);

                        baseB = baseA / rowB.o;
                        if (baseB < minSzB || baseA < minAmtB) {
                            console.log("CANNOT BUY B: LESS THAN MIN_AMT", {
                                baseB,
                                minSzB,
                                amtB: baseA,
                                minAmtB,
                            });
                            continue;
                        }

                        baseB *= 1 - TAKER;
                        baseB = toFixed(baseB, basePrB);

                        _quote = baseB * rowC.o;
                        if (baseB < minSzC || _quote < minAmtC) {
                            console.log("CANNOT BUY B: LESS THAN MIN_AMT", {
                                baseC: baseB,
                                minSzC,
                                amtC: _quote,
                                minAmtC,
                            });
                            continue;
                        }
                        _quote *= 1 - MAKER;
                        _quote = toFixed(_quote, pxPrC);

                        if (_quote >= bal) w += 1
                        else l += 1

                        bal = _quote;
                        console.log({ bal, START_BAL });
                        if (only) {
                            orders.push({
                                ts,
                                perc,
                                side: [
                                    `[${pairA}] BUY {H: ${rowA.h}, L: ${rowA.l}, V: ${rowA.v}}`,
                                    `[${pairB}] BUY {H: ${rowB.h}, L: ${rowB.l}, V: ${rowB.v}}`,
                                    `[${pairC}] SELL {H: ${rowC.h}, L: ${rowC.l}, V: ${rowC.v}}`,
                                ],
                                px: [
                                    `${pairA[1]} ${pxA}`,
                                    `${pairB[1]} ${pxB}`,
                                    `${pairC[1]} ${pxC}`,
                                ],
                                amt: [
                                    `${pairA[0]} ${baseA}`,
                                    `${pairB[0]} ${baseB}`,
                                    `${pairC[1]} ${_quote}`,
                                ],
                            });
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
            console.log({profit})
            const symbo = getSymbol([C, B], "okx");
            _data.push({ pair: symbo, profit, trades, w, l });
            parseData(orders);
            _save();
        }

        
        catch (e) {
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
