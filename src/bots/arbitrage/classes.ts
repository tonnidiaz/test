import { IMMEDIATE_SELL, MAKER_FEE_RATE, TAKER_FEE_RATE } from "@/utils/constants";
import { getPricePrecision, toFixed } from "@/utils/functions";
import { ICandle, IObj, IPlat } from "@/utils/interfaces";

export class Arbit {
    bal: number = 0;
    platA: IPlat;
    platB: IPlat;

    QUOTE_FEE: number;
    BASE_FEE: number;
    MAKER: number;
    TAKER: number;
    basePr: number = 0;
    pxPr: number = 0;
    pos = false
    MIN_PROFIT = .3 //.1
    entry = 0
    zvA = 0
    zvB = 0
    lastRow: ICandle

    _data: {
        orders: {
            side: "buy" | "sell";
            amt: number;
            px: number;
            row: ICandle;
            profit?: number
        }[];
    } = { orders: [] };

    constructor({
        platA,
        platB,
        bal,
        BASE_FEE,
        QUOTE_FEE,
        MAKER = MAKER_FEE_RATE,
        TAKER = TAKER_FEE_RATE,dfA,dfB,
        pxPr, basePr
    }: {
        platA: string;
        platB: string;
        bal: number;
        QUOTE_FEE: number;
        BASE_FEE: number;
        pxPr: number;
        basePr: number;
        MAKER?: number;
        TAKER?: number;
        dfA: ICandle[],
        dfB: ICandle[],
    }) {
        this.BASE_FEE = BASE_FEE;
        this.QUOTE_FEE = QUOTE_FEE;
        this.MAKER = MAKER;
        this.TAKER = TAKER;

        this.bal = bal
        this.platA = {name: platA, base: 0, quote: bal, df: dfA}
        this.platB = {name: platB, base: 0, quote: 0, df: dfB}
        this.lastRow = dfA[0]
        this.pxPr = pxPr
        this.basePr = basePr

    }

    buy({ amt, px, row }: { amt: number; px: number; row: ICandle }) {
        // BUY BASE ON A: SUBRACT QUOTE A
        console.log("\BUYING:", {amt, px})
        this.entry = px
        this.platA.quote -= amt;
        let _base = amt / px;
        const fee = _base * this.TAKER;
        _base -= fee
        _base = toFixed(_base, this.basePr)
        this.platA.base += _base

        this._data.orders.push({side: 'buy', amt: _base, px, row})
    }

    sell({ amt, px, row }: { amt: number; px: number; row: ICandle }) {
        // SELL QUOTE ON B: SUBRACT BASE B
        console.log("\nSELLING:", {amt, px})
        this.platB.base-= amt;
        let _quote = amt * px;
        const fee = _quote * this.MAKER;
        _quote -= fee
        _quote = toFixed(_quote, this.pxPr)
        this.platB.quote += _quote

        const _orders = this._data.orders
        const entry = _orders[_orders.length -1].px
        const profit = (px - entry) / entry * 100

        this._data.orders.push({side: 'sell', amt: _quote, px, row, profit: Number(profit.toFixed(2))})
        
    }

    withdraw({side, amt}: {side: 'buy' | 'sell', amt:number}){
        // WITHDRAW BASE FROM A IF SIDE IS BUY ELSE QUOTE FROM B
        if (side == 'buy'){
            // BASE FROM A TO B
            this.platA.base -= amt
            const fee = 0
            this.platB.base += amt - fee
            this.pos = true
        }else{
            // QUOTE FROM B TO A
            this.platB.quote -= amt
            const fee = 0
            this.platA.quote += amt - fee
            this.pos = false
        }
    }

    run() {
        const dfA = this.platA.df
        const dfB = this.platB.df
        const lenA = dfA.length
        const lenB = dfB.length

        const _len = Math.min(lenA, lenB)
        for (let i = 0; i < _len; i++){

            const rowA = dfA[i], rowB = dfB[i]

            console.log("\n", {tsA: rowA.ts, tsB: rowB.ts})
            if (rowA.ts != rowB.ts) break

            if (rowA.v == 0) this.zvA += 1
            if (rowB.v == 0) this.zvB += 1
            const buyPx = rowA.o, sellPx = rowB.o;
            this.lastRow = rowB

            let diff = (sellPx - buyPx) / buyPx * 100
            diff = Number(diff.toFixed(2))
            console.log({diff});

            if (this.pos && !IMMEDIATE_SELL// && sellPx >= this.entry * (1 + (this.MIN_PROFIT / 2)/100)
            ){
                this.sell({amt: this.platB.base, px: sellPx, row: rowB})
                this.withdraw({amt: this.platB.quote, side: 'sell'})}
            else if (!this.pos && diff >= this.MIN_PROFIT){
                this.buy({amt: this.platA.quote, px: buyPx, row: rowA})
                this.withdraw({amt: this.platA.base, side: 'buy'})

                if (IMMEDIATE_SELL){
                    this.sell({amt: this.platB.base, px: sellPx, row: rowB})
                    this.withdraw({amt: this.platB.quote, side: 'sell'})
                }

               
            }
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
        }

        const trades = this._data.orders.length / 2
        let _platA: IObj = this.platA
        delete _platA['df']
        let _platB: IObj = this.platB
        delete _platB['df']

        if (this.pos){
            console.log("ENDED WITH BUY")
            this.sell({amt: this.platB.base, px: this.entry, row: this.lastRow})
            this.withdraw({amt: this.platB.quote, side: 'sell'})
        }
        const profit = this.platA.quote  - this.bal
        console.log("\n",{trades, profit, zvA: this.zvA, zvB: this.zvB, _platA, _platB})

        return {profit, trades}

    }
}
