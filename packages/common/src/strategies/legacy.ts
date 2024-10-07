import { ceil } from "@cmn/utils/functions";
import { Backtest } from "./class";
import { WCS1 } from "@cmn/utils/constants";

export class Legacy extends Backtest {
    inloop({ i }: { i: number }): void {
        console.log("inloop");
        const _row = this.row;
        const { h, c, o, l, v } = _row;
        const TRAIL = 0.1; // .1
        const trail = ceil(
            this.prevrow.h * (1 - TRAIL / 100),
            this.pricePrecision
        );

        /**
         * Check if orders was filled
         */

        if (this.pos && this.exitLimit){
            const _row = this.prevrow
            if (_row.h >= this.exitLimit){
                this.exit = this.exitLimit;
                this._fillSell({_exit: this.exit, _base: this.base, _row})
            }
        }
        if (!this.pos && this.buyCond(this.prevrow, this.df, i)) {
            console.log("\nKAYA RA BUY\n");
            this.enterTs = this.row.ts;
            console.log(`HAS BUY SIGNAL...`);
            let m = this.minSz;
            //this.entry = this.row.o;



            if (
                true //this.prevrow.c < trail
                //&& this.prevrow.c <= this.prevrow.o // && v > 0
                //&& (l < o || (v > 0 && o == h && l == o && c == o))
            ) {
                this.entryLimit = this.prevrow.c // Math.max(this.prevrow.o, this.prevrow.c); //o;
                if (l <= this.entryLimit) {
                    this.entry = this.entryLimit;
                    const _entry = this.entry;
                    this._fillBuy({
                        amt: this.balance,
                        _row: this.row,
                        _entry: _entry,
                    });
                }
            } else {
                console.log("CANNOT BUY");
            }

            //if (!this.isGreen) return;
        } else if (this.pos && this.sellCond(this.prevrow, this.entry)) {
            this.enterTs = this.row.ts;
            this.exitLimit = this.prevrow.c
        }
       

    }
}
