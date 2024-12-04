import { Strategy } from "@cmn/classes/strategy";
import { objStrategies } from "@cmn/strategies";
import { ensureDirExists, existsSync, readJson, writeJson } from "@cmn/utils/bend/functions";
import { heikinAshi, parseKlines, tuCE } from "@cmn/utils/funcs2";
import { getInstrus, getKlinesPath } from "@cmn/utils/funcs3";
import {
    ceil,
    clearTerminal,
    getCoinPrecision,
    getPricePrecision,
    handleErrs,
    toFixed,
} from "@cmn/utils/functions";
import { ICandle, TPlatName } from "@cmn/utils/interfaces";

interface IOrder {
    side: "buy" | "sell";
    amt: number;
    px: number;
    status: "live" | "filled";
    id: string;
    row?: { ts: string; o: number; h: number; l: number; c: number };
}

class TuGrid {
    orders: IOrder[] = [];
    bal: number;
    pos = false;
    pair: string[];
    START_BAL: number;
    /** Grid spacing in percentage */
    gridSpacing = 1.1;
    totalGrids = 2;
    /**Take-profit in percentage */
    TP = 1.5//1.4;
    pxPr: number;
    basePr: number;
    df: ICandle[];
    MAKER = 0.1 / 100;
    TAKER = 0.1 / 100;
    base = 0;
    trades = 0;
    strat: Strategy;

    constructor({
        pair,
        bal,
        plat,
        df,
        strat
    }: {
        pair: string[];
        bal: number;
        plat: TPlatName;
        df: ICandle[];
        strat: Strategy
    }) {
        this.pair = pair;
        
        const pxPr = getPricePrecision(pair, plat);
        const basePr = getCoinPrecision(pair, "limit", plat);
        this.pxPr = pxPr;
        this.basePr = basePr;
        this.df = df;
        this.strat = strat;
        this.START_BAL = bal;
        // Purchase base using half capital
        this.bal = bal / 2;
        const baseAmt = bal - this.bal;
        const basePx = df[0].o
        let _base = baseAmt / basePx;
        _base *= 1 - this.TAKER;
        this.base = _base
    }

    placeOrder({
        amt,
        px,
        side,
        id,
    }: {
        amt: number;
        px: number;
        side: "buy" | "sell";
        id: string;
    }) {
        console.log(`\nPlacing ${amt} ${side} order at ${px}... `);

        this.orders.push({
            amt,
            px,
            side,
            status: "live",
            id,
        });
        if (side == "buy") {
            // this.bal -= amt
        } else {
            // this.base -= amt
        }
    }

    fillBuyOrder({ order, row }: { order: IOrder; row: ICandle }) {
        console.log("Filling buy order...");

        this.orders = this.orders.map((el) => {
            if (el.id == order.id) el.status = "filled";
            return el;
        });
        this.bal -= order.amt;
        let _base = order.amt / order.px;
        _base *= 1 - this.TAKER;
        this.base += _base;
        // // Place sell order at {TP} above order.px
        if (!this.orders.find(el=> el.side == 'buy' && el.status =='live')){
            console.log(`All buy orders filled`);
           const px = ceil(order.px * (1 + this.TP / 100), this.pxPr);
        const id = `sell-sell-${order.id}`;
        this.placeOrder({
            amt: toFixed(_base, this.basePr),
            px,
            side: "sell",
            id,
        }); 
        }
        
        this.tryClosePos()
    }

    fillSellOrder({ order, row }: { order: IOrder; row: ICandle }) {
        console.log(`Filling sell order at ${order.px}...`);

        this.orders = this.orders.map((el) => {
            if (el.id == order.id) {
                el.status = "filled";
                el.row = { ts: row.ts, o: row.o, h: row.h, l: row.l, c: row.c };
            }
            return el;
        });

        this.base -= order.amt;
        let quote = order.amt * order.px;
        quote *= 1 - this.MAKER;
        this.bal += quote;
        this.trades += 1;
        console.log({amt: order.amt, quote, bal: this.bal});
        // After orders update
        // console.log(this.orders);
        this.tryClosePos()
    }

    tryClosePos(){
        if (!this.orders.find((el) => el.status == "live")) {
            console.log("All orders filled");
            this.pos = false;
        }
    }

    run() {
        console.log(
            "\nBEGIN RUN",
            { START_BAL: this.START_BAL, bal: this.bal, base: this.base },
            "\n"
        );
        for (let i = 1; i < this.df.length; i++) {
            const row = this.df[i],
                prevrow = this.df[i - 1];
            const { ts } = row;

            console.log("\n", { ts });

            if (!this.pos && this.strat.sellCond(prevrow)) {
                // Place orders orders

                const orderAmt = toFixed(this.bal / this.totalGrids, this.pxPr);
                const sellOrderAmt = toFixed(this.base / this.totalGrids, this.basePr);
                if (orderAmt < 2) {
                    // Stop bot if the amount for each buy order is less than $2
                    console.log("\nAmount less than 2. Stopping bot...\n");
                    continue;
                }

                const medPx = prevrow.c;

                for (let i = 1; i <= this.totalGrids; i++) {
                    // Buy orders
                    const j = i + 1;
                    let px = medPx * (1 - (j * this.gridSpacing) / 100);
                    const id = `order-${Date.now() * j}`;
                    this.placeOrder({ amt: orderAmt, px, side: "buy", id });
                }
                for (let i = 1; i <= this.totalGrids; i++) {
                    // Sell orders
                    const j = i + 1;
                    let px = medPx * (1 + (j * this.gridSpacing) / 100);
                    const id = `sell-order-${Date.now() * j}`;
                    this.placeOrder({ amt: sellOrderAmt, px, side: "sell", id });
                }

                this.pos = true;
            } else {
                // If pos is true
                for (let order of this.orders.filter(
                    (el) => el.status == "live"
                )) {
                    // Check buy orders
                    if (order.side == "buy") {
                        if (prevrow.l <= order.px) {
                            // Order is filled
                            this.fillBuyOrder({ order, row: prevrow });
                        }
                    } else {
                        // Check sell orders
                        if (prevrow.h >= order.px) {
                            this.fillSellOrder({ order, row: prevrow });
                        }
                    }
                }
            }
        }

        // After all iterations
        console.log(`\nDONE!`, { bal: this.bal, base: this.base });
        if (this.base > 0) {
            console.log("Has base leftover");
            const px = this.df[this.df.length - 1].c;
            console.log({ px });
            this.bal += this.base * px;
            this.base = 0;
        }
        const profit = toFixed(this.bal - this.START_BAL, this.pxPr);
        console.log({ profit, trades: this.trades });
        // writeJson("_data/rf/grid/test.json", {profit, orders: this.orders})
        return { profit, trades: this.trades, orders: this.orders };
    }
}

interface IData {profit: number; trades: number; pair: string}

async function main({prefix, strNum} : {prefix?: string; strNum: number}) {
    clearTerminal();

    // return console.log(objStrategies.map((el, i)=> `${i + 1}. ${el.name}`));
    
    const save = true
    const only: string[] | undefined = true ? ["$AI", "USDT"] : undefined,
        bal = 11,
        plat: TPlatName = "bitget",
        start = "2024-01-01 00:00:00+02:00",
        end = "2024-10-28 23:29:00+02:00",
        interval = 60;
        const startTs = Date.parse(start),
        endTs = Date.parse(end),
        year = Number(start.slice(0, 4));
    let pairs = only
        ? [only]
        : getInstrus(plat).filter((el) => el[1] == "USDT");
    let _data :IData[] =  [];

    const strat = objStrategies[strNum - 1]
            console.log({strat: strat.name});

    const _prefix = prefix ? `${prefix}_` : ''
    const savePath = `_data/rf/grid/${year}/${_prefix}${plat}_${strat.name}_${interval}m.json`
    ensureDirExists(savePath)
    const _saveData = () =>{
        if (!save || only) return
        _data = _data.sort((a, b) => b.profit - a.profit)
        writeJson(savePath, _data)
    }
    for (let pair of pairs.sort()) {
        console.log(`\nBegin pair ${pair}...`);
        try {
            

            console.log(year);
            const kPath = getKlinesPath({
                pair,
                interval,
                demo: false,
                plat,
                year,
            });
            if (!existsSync(kPath)) {
                console.log(`${kPath} does not exist`);
                continue;
            }
            let klines = await readJson(kPath);
            klines = klines.filter((el) => el[0] >= startTs && el[0] <= endTs);
            const _klines = parseKlines(klines);
            if (_klines.length != klines.length) {
                console.log("Klines invalid");
                continue;
            }

            const df = tuCE(heikinAshi(_klines));
            
            const res = new TuGrid({ pair, plat, df, bal, strat }).run();
            if (!res) return
            _data.push({pair: pair.join("-"), profit: res.profit, trades: res.trades})
            _saveData()
        } catch (err) {
            handleErrs(err);
        }

        console.log(`\nPair ${pair} done!!`);
    }
}

const strNum = true ? 3 : 16
main({strNum, prefix: "1Drible"});
