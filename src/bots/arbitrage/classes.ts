import {
    IMMEDIATE_SELL,
    MAKER_FEE_RATE,
    MAX_QUOTE,
    TAKER_FEE_RATE,
} from "@/utils/constants";
import { coinFees, crossCoinFees } from "@/utils/consts3";
import { ceil, getPricePrecision, sleep, toFixed } from "@/utils/functions";
import { ICandle, IObj, IPlat } from "@/utils/interfaces";
import { linearPositionModeEnum } from "bybit-api";

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
    }) {
        this.MAKER = MAKER;
        this.TAKER = TAKER;
        this.MIN_PERC = MIN_PERC;
        this.pair = pair;

        this.bal = bal;
        const balA = bal
        this.platA = { name: platA, base: 0, quote: balA, df: dfA };
        this.platB = { name: platB, base: 0, quote: bal - balA, df: dfB };
        this.lastRow = dfA[0];
        this.pxPrA = pxPrA;
        this.pxPrB = pxPrB;
        this.basePrA = basePrA;
        this.basePrB = basePrB;
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
            side: `buy { o: ${o}, h: ${h}, l: ${l}, v: ${v || 'null'} }`,
            ccy: this.pair[0],
            amt: _base,
            px: [this.prefEntryPx, px],
            ts: [this.enterTs, row.ts],
        });
        this.entry = px
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
        if (_quote <= 5
        ) this.stop =true
        const _trades = this.trades;
        const profit = ((px - this.entry) / this.entry) * 100;

        const est_perc = ceil(
            ((this.prefExitPx - this.prefEntryPx) / this.prefEntryPx) * 100,
            2
        );
        const { o, h, l, v } = row;

        this.trades.push({
            side: `sell { o: ${o}, h: ${h}, l: ${l}, v: ${v || 'null'} }`,
            ccy: this.pair[1],
            amt: _quote,
            px: [this.prefExitPx, px],
            ts: [this.enterTs, row.ts],
            est_perc,
            perc: Number(profit.toFixed(2)),
        });

        this.exit = px
        this.exitLimit = undefined;
        return _quote;
    }

    withdraw({ side, amt }: { side: "buy" | "sell"; amt: number }) {
        // WITHDRAW BASE FROM A IF SIDE IS BUY ELSE QUOTE FROM B
        if (side == "buy") {
            // BASE FROM A TO B
            this.platA.base -= amt;
            
            // USDT 1 fee MAX
            const _plat = crossCoinFees[this.platA.name]
            const fee = _plat ? (_plat[this.pair[0]] ?? 0 ): 0; // TRANSFER FEE
            console.log('\n', {coin: this.pair[0], fee}, '\n')
            this.platB.base += toFixed(amt - fee, this.basePrA);
            //this.pos = true;
        } else {
            if (amt >= MAX_QUOTE) this.stop = true;

            // USDT 1 fee MAX
            const _plat = crossCoinFees[this.platB.name]
            const fee = _plat ? (_plat[this.pair[1]] ?? .8) : 0; // TRANSFER FEE
            console.log('\n', {coin: this.pair[1], fee}, '\n')
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
            await sleep(.000001)
            try {
                const rowA = dfA[i],
                    rowB = dfB[i]; 
                const prevrowA = dfA[i - 1],
                    prevrowB = dfB[i - 1];

                const { o: p_oA, h: p_hA, c: p_cA, l: p_lA } = prevrowA;
                const { o: oA, h: hA, c: cA, l: lA } = rowA;

                const { o: p_oB, h: p_hB, c: p_cB, l: p_lB } = prevrowB;
                const { o: oB, h: hB, c: cB, l: lB } = rowB;

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

                if (this.pos && this.otype == "limit") {
                    console.log("\nHas pos", {
                        side: this.entryLimit ? "buy" : "sell",
                    });
                    if (this.entryLimit) {
                        if (p_lA < this.entryLimit) {
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

                            // PLACE THE SELL ORDER AT CURR ROW
                        }
                        continue;
                    }
                    if (!this.entryLimit && !this.withdrawnA) {
                        this.withdrawnA = true;
                        console.log(`\n[ ${prevrowA.ts} ] WITHDRAW TIME [A]`);
                        this.trades.push({
                            ts: [prevrowA.ts],
                            side: "WITHDRAW A [BUY]",
                            amt: this.platB.base,
                            ccy: this.pair[0],
                            px: [0],
                        });
                        continue;
                    }
                    if (!this.entryLimit && this.exitLimit) {
                        if (this.exitLimit < p_hB) {
                            console.log("\nFILL SELL\n");
                            this.closePos({
                                amt: this.platB.base,
                                px: this.exitLimit,
                                row: prevrowB,
                            });
                            //this.sell({ amt: this.platB.base, px: sellPx, row: rowB });
                            //this.withdraw({ amt: this.platB.quote, side: "sell" })
                            if (!this.withdrawnB) {
                                this.withdrawnB = true;
                                console.log(
                                    `\n[ ${rowB.ts} ] WITHDRAW TIME [B]`
                                );
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
                    }
                }
                const CONST = .25
                if (this.pos && this.otype == "limit") {
                    if (this.entryLimit) {
                        this.entryLimit = ceil(
                            p_cA * (1 - CONST / 100),
                            this.pxPrA
                        );
                    }
                    if (this.exitLimit) {
                        this.exitLimit = ceil(
                            p_cB * (1 + CONST / 100),
                            this.pxPrB
                        );
                    }
                    continue;
                }

                if (!this.pos && diff >= this.MIN_PERC) {
                    console.log("\nGOING IN...\n");
                    this.withdrawnA = false;
                    this.withdrawnB = false;
                    this.enterTs = rowA.ts;
                    this.entryLimit = ceil(p_cA * (1 - CONST / 100), this.pxPrA);
                    this.exitLimit = ceil(p_cB * (1 + CONST / 100), this.pxPrB);

                    this.prefEntryPx = this.entryLimit;
                    this.prefExitPx = this.exitLimit;
                    this.pos = true;
                }

                if (this.pos && this.otype == "market") {
                    /**
                     * BUY [A] - WITHDRAW [A]
                     * SELL [B] - WITHDRAW [B]
                     */

                    this.entry = buyPx;
                    this.exit = sellPx;

                    console.log("\nFILL MARKET BUY\n");
                    if (this.entryLimit) {
                        this.buy({
                            amt: this.platA.quote,
                            px: this.entry,
                            row: rowA,
                        });
                        this.withdraw({
                            amt: this.platA.base,
                            side: "buy",
                        });

                        this.withdrawnA = true;
                        console.log(`\n[ ${rowA.ts} ] WITHDRAW TIME [A]`);
                        this.trades.push({
                            ts: [rowA.ts],
                            side: "WITHDRAW A [BUY]",
                            amt: this.platB.base,
                            ccy: this.pair[0],
                            px: [0],
                        });

                        continue;
                    }

                    if (this.exitLimit) {
                        console.log("\nFILL MARKET SELL\n");
                        this.closePos({
                            amt: this.platB.base,
                            px: this.exit,
                            row: rowB,
                        });
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
                // if (this.pos && !IMMEDIATE_SELL) {
                //     this.sell({ amt: this.platB.base, px: sellPx, row: rowB });
                //     this.withdraw({ amt: this.platB.quote, side: "sell" });
                //     continue;
                // } else if (!this.pos && diff >= this.MIN_PROFIT) {
                //     this.buy({ amt: this.platA.quote, px: buyPx, row: rowA });
                //     this.withdraw({ amt: this.platA.base, side: "buy" });

                //     if (IMMEDIATE_SELL) {
                //         this.sell({
                //             amt: this.platB.base,
                //             px: sellPx,
                //             row: rowB,
                //         });
                //         this.withdraw({ amt: this.platB.quote, side: "sell" });
                //     }
                // }
                // console.log({sellPx});
                // if (!this.pos){
                //     this.entry = buyPx
                //     this.buy({amt: this.platA.quote, px: buyPx, row: rowA})
                //     this.withdraw({amt: this.platA.base, side: 'buy'})
                // }else if (this.pos){
                //     const diff2 = (sellPx - this.entry) / this.entry * 100
                //     if (diff2 >= .0){
                //          this.sell({amt: this.platB.base, px: sellPx, row: rowB})
                //   this.withdraw({amt: this.platB.quote, side: 'sell'})
                //     }

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
