import { ceil } from "@/utils/functions";
import { Backtest } from "./class";

export class Def5Adv extends Backtest {
    name: string = "DefTester";

    inloop({ i }: { i: number }): void {
        console.log("inloop");
        const _row = this.row;
        const { h, c, o } = _row;
        const TRAIL = 0.1; // .1
        const trail = ceil(
            this.prevrow.h * (1 - TRAIL / 100),
            this.pricePrecision
        );
        console.log({ o, trail });

        if (!this.pos && this.entryLimit){
            const _row = this.prevrow
            const {h, l} = _row

            if (l <= this.entryLimit){
                this.entry = this.entryLimit
                this._fillBuy({amt: this.balance, _entry: this.entry, _row})
            }
        }
        if (!this.pos && this.buyCond(this.prevrow, this.df, i)) {
            console.log("\nKAYA RA BUY\n");
            this.enterTs = this.row.ts;
            console.log(`HAS BUY SIGNAL...`);
            let m = this.minSz;
            this.entryLimit = this.prevrow.c * (1 - .0/100);


            // if (o < trail && this.prevrow.c <= this.prevrow.o)
            //     this._fillBuy({
            //         amt: this.balance,
            //         _row: this.row,
            //         _entry: this.entry,
            //     });
            // else {
            // }

            //if (this.isGreen) return;
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
            let SL = 0.5; //_sell ? 1 : .5; //.5//1.2;

            const _sl = ceil(this.entry * (1 - SL / 100), this.pricePrecision);
            const isO =
                this.prevrow.h == Math.max(this.prevrow.c, this.prevrow.o);

            isSl = !this.isGreen; //_sell || true;
            let is_market = false;
            const minTP = this.entry * (1 + 1 / 100);
            const openCond = (o >= trail && isO) || o > minTP;
            if (false) {
            } else if (openCond) {
                this.exit = o;
                is_market = true;
                //isSl = false
            } else {
                this.exit = this.exitLimit;
                isSl = true;
            }

            console.log({ isSl, exit: this.exit, trail, _sl });
            if (
                this.exit != 0 &&
                (is_market || h >= this.exit) &&
                (isSl || this.exit >= _sl)
            ) {
                this.isSl = this.exit < this.entry;

                if (is_market) {
                    console.log("FILLING MARKET SELL ORDER AT OPEN");
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
