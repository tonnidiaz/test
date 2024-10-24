import { Strategy } from "@cmn/classes/strategy";
import { MAKER_FEE_RATE, TAKER_FEE_RATE, MAX_QUOTE } from "@cmn/utils/constants";
import { crossCoinFees } from "@cmn/utils/consts3";
import { toFixed, ceil } from "@cmn/utils/functions";
import { IPlat, ICandle, IObj } from "@cmn/utils/interfaces";

export class Arbit {
    bal: number = 0;
    platA: IPlat;
    platB: IPlat;

    MAKER: number;
    TAKER: number;
    basePrA: number = 0;
    basePrB: number = 0;
    pxPrA: number = 0;
    pxPrB: number = 0;
    pos = false;
    MIN_PERC: number; //.3 //.1
    entry = 0;
    exit = 0;
    zvA = 0;
    zvB = 0;
    lastRow: ICandle;
    lastMedPxA = 0;
    lastMedPxB = 0;
    prefEntryPx = 0;
    prefExitPx = 0;
    entryLimit: number | undefined;
    exitLimit: number | undefined;
    stop = false;
    withdrawnA = true;
    withdrawnB = true;
    tradeCnt = 0;
    enterTs = "";
    est_perc = 0;
    pair: string[];
    SLIP = 0 / 100;

    otype: "market" | "limit" = "market";

    trades: {
        ts: string[];
        side: string;
        ccy?: string;
        amt: number;
        px: number[];
        perc?: number;
        est_perc?: number;
    }[] = [];

    strat: Strategy;
    constructor({
        platA,
        platB,
        pair,
        bal,
        MAKER = MAKER_FEE_RATE,
        TAKER = TAKER_FEE_RATE,
        dfA,
        dfB,
        pxPrA,
        pxPrB,
        basePrA,
        basePrB,
        MIN_PERC,
        strat,
    }: {
        platA: string;
        platB: string;
        pair: string[];
        bal: number;
        pxPrA: number;
        pxPrB: number;
        basePrA: number;
        basePrB: number;
        MAKER?: number;
        TAKER?: number;
        dfA: ICandle[];
        dfB: ICandle[];
        MIN_PERC: number;
        strat: Strategy;
    }) {
        this.MAKER = MAKER;
        this.TAKER = TAKER;
        this.MIN_PERC = MIN_PERC;
        this.pair = pair;

        this.bal = bal;
        const balA = bal;
        this.platA = { name: platA, base: 0, quote: balA, df: dfA };
        this.platB = { name: platB, base: 0, quote: bal - balA, df: dfB };
        this.lastRow = dfA[0];
        this.pxPrA = pxPrA;
        this.pxPrB = pxPrB;
        this.basePrA = basePrA;
        this.basePrB = basePrB;
        this.strat = strat;
    }

    buy({ amt, px, row }: { amt: number; px: number; row: ICandle }) {
        // BUY BASE ON A: SUBRACT QUOTE A
        console.log("BUYING:", { amt, px });
        this.entry = px;
        this.platA.quote -= amt;
        let _base = amt / px;

        const slip = _base * this.SLIP;
        _base -= slip;

        const fee = _base * this.TAKER;

        _base -= fee;
        _base = toFixed(_base, this.basePrA);
        console.log({ base: _base, fee }, "\n");
        this.platA.base += _base;

        const { o, h, l, v } = row;

        this.trades.push({
            side: `buy { o: ${o}, h: ${h}, l: ${l}, v: ${v || "null"} }`,
            ccy: this.pair[0],
            amt: _base,
            px: [this.prefEntryPx, px],
            ts: [this.enterTs, row.ts],
        });
        this.entry = px;
        this.entryLimit = undefined;
    }

    sell({ amt, px, row }: { amt: number; px: number; row: ICandle }) {
        // SELL QUOTE ON B: SUBRACT BASE B
        console.log("\nSELLING:", { amt, px });
        this.platB.base -= amt;
        let _quote = amt * px;

        const slip = _quote * this.SLIP;
        _quote -= slip;

        const fee = _quote * this.MAKER;
        _quote -= fee;
        _quote = toFixed(_quote, this.pxPrB);
        console.log({ pr: this.pxPrB, quote: _quote, fee }, "\n");
        this.platB.quote += _quote;
        if (_quote <= 5) this.stop = true;
        const _trades = this.trades;
        const profit = ((px - this.entry) / this.entry) * 100;

        const est_perc = ceil(
            ((this.prefExitPx - this.prefEntryPx) / this.prefEntryPx) * 100,
            2
        );
        const { o, h, l, v } = row;

        this.trades.push({
            side: `sell { o: ${o}, h: ${h}, l: ${l}, v: ${v || "null"} }`,
            ccy: this.pair[1],
            amt: _quote,
            px: [this.prefExitPx, px],
            ts: [this.enterTs, row.ts],
            est_perc,
            perc: Number(profit.toFixed(2)),
        });

        this.exit = px;
        this.exitLimit = undefined;
        return _quote;
    }

    withdraw({ side, amt }: { side: "buy" | "sell"; amt: number }) {
        // WITHDRAW BASE FROM A IF SIDE IS BUY ELSE QUOTE FROM B
        if (side == "buy") {
            // BASE FROM A TO B
            this.platA.base -= amt;

            // USDT 1 fee MAX
            const _plat = crossCoinFees[this.platA.name];
            const fee = _plat ? _plat[this.pair[0]] ?? 0 : 0; // TRANSFER FEE
            console.log("\n", { coin: this.pair[0], fee }, "\n");
            this.platB.base += toFixed(amt - fee, this.basePrA);
            //this.pos = true;
        } else {
            if (amt >= MAX_QUOTE) this.stop = true;

            // USDT 1 fee MAX
            const _plat = crossCoinFees[this.platB.name];
            const fee = _plat ? _plat[this.pair[1]] ?? 0.8 : 0; // TRANSFER FEE
            console.log("\n", { coin: this.pair[1], fee }, "\n");
            // QUOTE FROM B TO A
            this.platB.quote -= amt;
            let _quote = amt - fee;
            this.platA.quote += toFixed(_quote, this.pxPrB);
            this.pos = false;
        }
    }
    // conver({plat, amt}: {plat: 'A' | 'B', amt:number}){
    //     // WITHDRAW BASE FROM A IF SIDE IS BUY ELSE QUOTE FROM B
    //     if (plat == 'A'){
    //         // BASE FROM A TO B
    //         this.platA.base -= amt
    //         const fee = 0
    //         this.platB.base += amt - fee
    //         this.pos = true
    //     }else{
    //         // QUOTE FROM B TO A
    //         this.platB.quote -= amt
    //         const fee = 0
    //         this.platA.quote += amt - fee
    //         this.pos = false
    //     }
    // }

    /**
     *
     * SELLS AND WITHDRAWS FROM B
     */
    closePos({ amt, px, row }: { amt: number; px: number; row: ICandle }) {
        const quote = this.sell({ amt, px, row });
        this.withdraw({ amt: quote, side: "sell" });
        this.pos = false;
        this.entryLimit = undefined;
        this.exitLimit = undefined;
        this.tradeCnt += 1;
    }

    async run() {
        const dfA = this.platA.df;
        const dfB = this.platB.df;
        const lenA = dfA.length;
        const lenB = dfB.length;

        const _len = Math.min(lenA, lenB);
        for (let i = 1; i < _len; i++) {
            if (this.stop) break;
            // await sleep(0.000001);
            try {
                const rowA = dfA[i],
                    rowB = dfB[i];
                const prevrowA = dfA[i - 1],
                    prevrowB = dfB[i - 1];

                const { o: p_oA, h: p_hA, c: p_cA, l: p_lA } = prevrowA;
                const { o: oA, h: hA, c: cA, l: lA } = rowA;

                const { o: p_oB, h: p_hB, c: p_cB, l: p_lB } = prevrowB;
                const { o: oB, h: hB, c: cB, l: lB } = rowB;

                const isGreenA = p_cA >= p_oA;
                const isGreenB = p_cB >= p_oB;

                if (rowA.ts != rowB.ts) break;

                if (rowA.v == 0) this.zvA += 1;
                if (rowB.v == 0) this.zvB += 1;

                const _slip = 0 / 100;
                let buyPx = oA * (1 + _slip),
                    sellPx = oB * (1 - _slip);
                //if (rowA.v) buyPx = Math.min(hA, buyPx);

                //if (rowB.v) sellPx = Math.max(lB, sellPx);
                console.log("\n", { ts: rowA.ts });

                this.lastRow = rowB;

                let diff = ceil(((sellPx - buyPx) / buyPx) * 100, 2); //(sellPx - buyPx) / buyPx * 100
                console.log({ diff });

                if (!this.pos && this.entryLimit) {
                    if (p_lA <= this.entryLimit) {
                        console.log("\nFILL BUY\n");
                        this.buy({
                            amt: this.platA.quote,
                            px: this.entryLimit,
                            row: prevrowA,
                        });
                        this.withdraw({
                            amt: this.platA.base,
                            side: "buy",
                        });

                        // WITHDRAW A
                        this.withdrawnA = true;
                        console.log(`\n[ ${rowA.ts} ] WITHDRAW TIME [A]`);
                        this.trades.push({
                            ts: [rowA.ts],
                            side: "WITHDRAW A [BUY]",
                            amt: this.platB.base,
                            ccy: this.pair[0],
                            px: [0],
                        });

                        this.pos = true;
                        continue;
                    } else {
                        // Adjust entryLimit
                    }
                } else if (this.exitLimit) {
                    if (this.exitLimit <= p_hB) {
                        console.log("\nFILL SELL\n");
                        this.closePos({
                            amt: this.platB.base,
                            px: this.exitLimit,
                            row: prevrowB,
                        });
                        //this.sell({ amt: this.platB.base, px: sellPx, row: rowB });
                        //this.withdraw({ amt: this.platB.quote, side: "sell" })
                        this.withdrawnB = true;
                        console.log(`\n[ ${rowB.ts} ] WITHDRAW TIME [B]`);
                        this.trades.push({
                            ts: [rowB.ts],
                            side: "WITHDRAW B [SELL]",
                            amt: this.platA.quote,
                            ccy: this.pair[1],
                            px: [0],
                        });

                        continue;
                    }
                }

                console.log({
                    pos: this.pos,
                    buyCond: this.strat.buyCond(prevrowA, []),
                });
                if (!this.pos && this.strat.buyCond(prevrowA, [])) {
                    console.log("\nKAYA RA BUY\n");
                    this.enterTs = rowA.ts;
                    console.log(`HAS BUY SIGNAL...`);

                    if (prevrowA.v > 0 || true) {
                        this.entryLimit =
                            Math.min(prevrowA.c) * (1 - 0.1 / 100); //o;
                    }
                }
                if (this.pos && this.strat.sellCond(prevrowB)) {
                    const TRAIL = 0.5; // .1
                    const trail = ceil(
                        prevrowB.h * (1 - TRAIL / 100),
                        this.pxPrB
                    );
                    const e = Math.max(p_oB, p_cB);
                    this.exitLimit = e * (1 + 3/ 100);
                    this.exitLimit = toFixed(this.exitLimit, this.pxPrB);
                    this.exit = 0;

                    let isSl = false;
                    let SL = 5;

                    const _sl = ceil(this.entry * (1 - SL / 100), this.pxPrB);
                    const isO = prevrowB.h == Math.max(prevrowB.c, prevrowB.o);

                    let is_market = false;

                    const TP = 2.5;
                    const minTP = this.entry * (1 + TP / 100);
                    const openCond =
                        (prevrowB.c >= trail && isO) || prevrowB.c >= minTP;

                    this.exitLimit = openCond
                        ? Math.max(minTP, this.exitLimit)
                        : this.exitLimit;
                    //isSl = isGreenB; //!openCond;

                    if (!isSl && this.exitLimit < _sl) {
                        this.exitLimit = _sl; // * (1 + .15/100)
                    }
                }
                // if (!this.pos && diff >= this.MIN_PERC) {
                //     console.log("\nGOING IN...\n");
                //     this.withdrawnA = false;
                //     this.withdrawnB = false;
                //     this.enterTs = rowA.ts;
                //     this.entryLimit = ceil(p_cA * (1 - 0.1 / 100), this.pxPrA);
                //     this.exitLimit = ceil(p_cB * (1 + 0.5 / 100), this.pxPrB);

                //     this.prefEntryPx = this.entryLimit;
                //     this.prefExitPx = this.exitLimit;
                //     this.pos = false;
                // }
            } catch (e) {
                console.log(e);
                continue;
            }
        }

        let _platA: IObj = this.platA;
        delete _platA["df"];
        let _platB: IObj = this.platB;
        delete _platB["df"];

        if (this.pos) {
            console.log("ENDED WITH BUY");
            this.sell({
                amt: this.platB.base,
                px: this.entry,
                row: this.lastRow,
            });
            this.withdraw({ amt: this.platB.quote, side: "sell" });
        }
        const profit = toFixed(this.platA.quote - this.bal, 2);
        console.log("\n", {
            trades: this.tradeCnt,
            profit,
            zvA: this.zvA,
            zvB: this.zvB,
            _platA,
            _platB,
        });

        return { profit, trades: this.trades, tradeCnt: this.tradeCnt };
    }
}
