import { ceil } from "@cmn/utils/functions";
import { Backtest } from "./class";
import { WCS1 } from "@cmn/utils/constants";

export class Trailer extends Backtest {
    inloop({ i }: { i: number }): void {
        console.log("inloop");
        const _row = this.row;
        const { h, c, o, l, v } = _row;

        if (!this.pos && this.buyCond(this.prevrow, this.df, i)) {
            console.log("\nKAYA RA BUY\n");
            this.enterTs = this.row.ts;
            console.log(`HAS BUY SIGNAL...`);
            let m = this.minSz;
            //this.entry = this.row.o;

            if (
                true//this.prevrow.c < trail
                 //&& this.prevrow.c <= this.prevrow.o // && v > 0
                //&& (l < o || (v > 0 && o == h && l == o && c == o))
            ) {
                this.entryLimit = Math.min(this.prevrow.o, this.prevrow.c); //o;
                if (l < this.entryLimit) {
                 
                    this.entry = this.entryLimit
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
            return;
        }

        if (this.pos) {
            this.enterTs = this.row.ts;
        }

        if (this.pos) {
            console.log("HAS POS");
            const e = Math.max(this.prevrow.o, this.prevrow.c);
            this.exitLimit = e * (1 + 3.5 / 100);
            
            const _sell = !this.isGreen && this.prevrow.c >= o;
            this.exit = 0;

            let isSl = false;
            let SL = 5.5; //_sell ? 1 : .5; //.5//1.2;

            const _sl = ceil(this.entry * (1 - SL / 100), this.pricePrecision);
            const isO =
                this.prevrow.h == Math.max(this.prevrow.c, this.prevrow.o);

            isSl = !this.isGreen; //_sell || true;
            let is_market = false;

            const TRAIL_CONST = 1.5
            const trailPx = h * (1 - TRAIL_CONST / 100)

            const TP = 1;
            const minTP = o * (1 + TP / 100);
            if (false) {
            }
            
            else if (trailPx >= minTP) {
                this.exit = true ? minTP : trailPx;
                isSl = false;
            }

            const exit = this.exit;

            console.log({ isSl, exit: this.exit, trailPx, _sl });
            if (
                //v > 0 &&
                this.exit != 0 &&
                (is_market || h > exit) && // || (h >= exit && v > 0 && h == o && l == o && c ==o )
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
