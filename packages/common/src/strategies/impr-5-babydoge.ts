import { ceil, toFixed } from "@cmn/utils/functions";
import { Backtest } from "./class";
import { isMarket, WCS1 } from "@cmn/utils/constants";

export class Impr5 extends Backtest {
    inloop({ i }: { i: number }): void {
        console.log("inloop");
        const _row = this.row;
        const { h, c, o, l, v } = _row;
        const TRAIL = 0.1; // .1
        const trail = ceil(
            this.prevrow.h * (1 - TRAIL / 100),
            this.pricePrecision
        );

        if (!this.pos && this.buyCond(this.prevrow, this.df, i)) {
            console.log("\nKAYA RA BUY\n");
            this.enterTs = this.row.ts;
            console.log(`HAS BUY SIGNAL...`);
            let m = this.minSz;

            if (this.prevrow.v > 0) {
                this.entryLimit = Math.min(this.prevrow.o, this.prevrow.c); //o;
                if (l < this.entryLimit) {
                    this.entry = this.entryLimit;
                    const _entry = this.entry;
                    this._fillBuy({
                        amt: this.balance,
                        _row: this.row,
                        _entry: _entry,
                    });
                }
            }

            return;
        }

        if (this.pos) {
            this.enterTs = this.row.ts;
            console.log("HAS POS");
            const e = Math.max(this.prevrow.o, this.prevrow.c);
            this.exitLimit = e * (1 + 1.5 / 100);
            this.exitLimit = toFixed(this.exitLimit, this.pricePrecision)
            this.exit = 0;

            let isSl = false;
            let SL = 5;

            const _sl = ceil(this.entry * (1 - SL / 100), this.pricePrecision);
            const isO =
                this.prevrow.h == Math.max(this.prevrow.c, this.prevrow.o);

            let is_market = false;

            const TP = 1.5;
            const minTP = this.entry * (1 + TP / 100);
            const openCond =
                (this.prevrow.c >= trail && isO) || this.prevrow.c >= minTP;

            this.exit = openCond
                ? Math.max(minTP, this.exitLimit)
                : this.exitLimit;
            isSl = openCond;

            this.exit = toFixed(this.exit, this.pricePrecision)
            const exit = this.exit;

            console.log({ isSl, exit: this.exit, trail, _sl });
            
            if (
                this.exit != 0 &&
                (is_market || h > exit) &&
                (isSl || this.exit >= _sl)
            ) {
                if (this.exit > o) {
                    console.log("EXIT > O");
                } else {
                    console.log("EXIT <= O");
                }
                this.isSl = this.exit < this.entry;

                if (is_market) {
                    this.exitLimit = o;
                    console.log("FILLING MARKET SELL ORDER AT OPEN");
                    //if (WCS1) this.exit = l
                    this._fillSell({
                        _base: this.base,
                        _exit: this.exit,
                        _row,
                        isSl: this.isSl,
                    });
                } else {
                    console.log("FILLING LIMIT SELL ORDER");
                    this.sell_order_filled = true;
                    this.amt_sold = this.base;
                }
            }
        }
    }
}
