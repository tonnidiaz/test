import { Strategy, TBuyCond, TSellCond } from "@cmn/classes/strategy";
import { MAKER_FEE_RATE, TAKER_FEE_RATE, MAX_QUOTE } from "@cmn/utils/constants";
import { toFixed, ceil, calcPerc } from "@cmn/utils/functions";
import { IPlat, ICandle, IObj } from "@cmn/utils/interfaces";

export class ArbitComp {
    bal: number = 0;
    MAKER: number;
    TAKER: number;
    basePr: number = 0;
    pxPr: number = 0;
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
    tradeCnt = 0;
    enterTs = "";
    est_perc = 0;
    pair: string[];
    SLIP =     0
    base = 0
    platA: IPlat;
    platB: IPlat;
    otype: "market" | "limit" = "limit";

    trades: {
        ts: string[];
        side: string;
        ccy?: string;
        amt: number;
        px: number[];
        perc?: number;
        est_perc?: number;
    }[] = [];
    START_BAL: number;

    strat: Strategy

    constructor({
        platA,
        platB,
        pair,
        bal,
        MAKER = MAKER_FEE_RATE,
        TAKER = TAKER_FEE_RATE,
        dfA,
        dfB,
        pxPr,
        basePr,
        MIN_PERC,
        strat
    }: {
        platA: string;
        platB: string;
        pair: string[];
        bal: number;
        pxPr: number;
        basePr: number;
        MAKER?: number;
        TAKER?: number;
        dfA: ICandle[];
        dfB: ICandle[];
        MIN_PERC: number;
        strat: Strategy
    }) {
        this.MAKER = MAKER;
        this.TAKER = TAKER;
        this.MIN_PERC = MIN_PERC; 
        this.pair = pair;
        this.platA = {name: platA, base: 0, quote: bal, df: dfA, }
        this.platB = {name: platB, base: 0, quote: 0, df: dfB,}
        this.bal = bal;
        this.START_BAL = bal
        this.lastRow = dfA[0];
        this.pxPr = pxPr;
        this.basePr = basePr;
        this.strat = strat
    }

    buy({ amt, px, row }: { amt: number; px: number; row: ICandle }) {
        // BUY BASE ON A: SUBRACT QUOTE A
        console.log("BUYING:", { amt, px });
        this.entry = px;
        this.bal -= amt;
        let _base = amt / px;

        const slip = _base * this.SLIP;
        _base -= slip;

        const fee = _base * this.TAKER;

        _base -= fee;
        _base = toFixed(_base, this.basePr);
        console.log({ base: _base, fee }, "\n");
        this.base += _base;

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
        this.base -= amt;
        let _quote = amt * px;

        const slip = _quote * this.SLIP;
        _quote -= slip;

        const fee = _quote * this.MAKER;
        _quote -= fee;
        _quote = toFixed(_quote, this.pxPr);
        console.log({ pr: this.pxPr, quote: _quote, fee }, "\n");
        this.bal += _quote;
        if (_quote <= 5
        ) this.stop =true
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


    // conver({plat, amt}: {plat: 'A' | 'B', amt:number}){
    //     // WITHDRAW BASE FROM A IF SIDE IS BUY ELSE QUOTE FROM B
    //     if (plat == 'A'){
    //         // BASE FROM A TO B
    //         this.base -= amt
    //         const fee = 0
    //         this.base += amt - fee
    //         this.pos = true
    //     }else{
    //         // QUOTE FROM B TO A
    //         this.quote -= amt
    //         const fee = 0
    //         this.quote += amt - fee
    //         this.pos = false
    //     }
    // }

    /**
     *
     * SELLS AND WITHDRAWS FROM B
     */
    closePos({ amt, px, row }: { amt: number; px: number; row: ICandle }) {
        const quote = this.sell({ amt, px, row });
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
            // await sleep(.000001)
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
                let buyPx = p_cA * (1 + _slip),
                    sellPx = p_cB * (1 - _slip);
                //if (rowA.v) buyPx = Math.min(hA, buyPx);

                //if (rowB.v) sellPx = Math.max(lB, sellPx);
                console.log("\n", { ts: rowA.ts });

                this.lastRow = rowA;

                let diff = ceil(((sellPx - buyPx) / buyPx) * 100, 2); //(sellPx - buyPx) / buyPx * 100
                console.log({ diff, buyPx, sellPx });

                if (this.pos && this.otype == "limit") {
                    console.log("\nHas pos", {
                        side: this.entryLimit ? "buy" : "sell",
                    });

                    if (this.entryLimit) {
                        if (p_lA < this.entryLimit) {
                            // Limit buy order was filled in the prev row
                            console.log("\nFILL LIMIT BUY\n");
                            this.buy({
                                amt: this.bal,
                                px: this.entryLimit,
                                row: prevrowA,
                            });
                        
                            // PLACE THE SELL ORDER AT CURR ROW
                        }
                        
                    }
                    else if (!this.entryLimit && this.exitLimit) {
                        if (this.exitLimit < p_hA) {
                            console.log("\nFILL SELL\n");
                            this.closePos({
                                amt: this.base,
                                px: this.exitLimit,
                                row: prevrowA,
                            });
                        }
                    }
                    
            
                    
                }
                const CONST = .5
                const _calcExit = () =>{
                    return ceil(
                        p_cB * (1 + (CONST * 2) / 100),
                        this.pxPr
                    )
                }
                if (this.pos && this.otype == "limit") {
                    // Re-adjust the prices
                    console.log(`\nRe-adjusting...\n`);
                    if (this.entryLimit) {
                        this.entryLimit = ceil(
                            p_cA * (1 - CONST / 100),
                            this.pxPr
                        );
                    }
                    if (this.exitLimit) {
                        const _exitLimit = _calcExit();
                        const diff = calcPerc(this.exitLimit, _exitLimit)
                        const SL = 2
                        console.log({diff});
                        const sl = this.exitLimit * (1 - SL / 100)
                        if (diff >= -SL)
                            this.exitLimit = _exitLimit
                    }
                    continue;
                }

                const cond = this.strat.buyCond(prevrowB) || this.strat.buyCond(prevrowA)
                if (!this.pos && diff >= this.MIN_PERC && this.strat.buyCond(prevrowA)) {
                    console.log("\nGOING IN...\n");
                    this.enterTs = rowA.ts;
                    this.entryLimit = ceil(p_cA * (1 - CONST / 100), this.pxPr);
                    this.exitLimit = _calcExit();

                    this.prefEntryPx = this.entryLimit;

                    // Buy at market
                    if (true){
                        console.log("\nFILL MARKET BUY\n");
                            this.buy({
                                amt: this.bal,
                                px: oA,
                                row: rowA,
                            });
                    }
                    this.prefExitPx = this.exitLimit;
                    this.pos = true;
                }

           
            } catch (e) {
                console.log(e);
                continue;
            }
        }


        if (this.pos) {
            console.log("ENDED WITH BUY");
            this.sell({
                amt: this.base,
                px: this.entry,
                row: this.lastRow,
            });
        }
        const profit = toFixed(this.bal - this.START_BAL, 2);
        console.log("\n", {
            trades: this.tradeCnt,
            profit,
            zvA: this.zvA,
            zvB: this.zvB,
        });

        return { profit, trades: this.trades, tradeCnt: this.tradeCnt };
    }
}
