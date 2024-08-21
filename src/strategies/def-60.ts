import { ceil } from "@/utils/functions";
import { Backtest } from "./class";

export class DefTester60 extends Backtest {
    name: string = "DefTester";

    inloop({ i }: { i: number }): void {
        console.log("inloop");

        if (!this.pos && this.buyCond(this.prevrow, this.df, i)) {
            console.log("\nKAYA RA BUY\n");
            this.enterTs = this.row.ts;
            console.log(`HAS BUY SIGNAL...`);
            let m = this.minSz;
            this.entry = this.row.o;
            this._fillBuy({
                amt: this.balance,
                _row: this.row,
                _entry: this.entry,
            });

            //if (this.isGreen) return;
        }

        if (this.pos) {
            this.enterTs = this.row.ts;
        }

        if (this.pos) {
            console.log("HAS POS");
            const e = Math.max(this.prevrow.o, this.prevrow.c);
            this.exitLimit = e * (1 + 3 / 100);
            const _row = this.row;

            const { h, c, o, l } = _row;
            const _sell = !this.isGreen && this.prevrow.c >= o;
            this.exit = 0;

            let isSl = false;
            let SL = 4.5; //_sell ? 1 : .5; //.5//1.2;
            const TRAIL = 0.1; // .1
            const trail = ceil(
                this.prevrow.h * (1 - TRAIL / 100),
                this.pricePrecision
            );

            const _sl = this.entry * (1 - SL / 100);
            const isO =
                this.prevrow.h == Math.max(this.prevrow.c, this.prevrow.o);

            let is_market = false;
            isSl = !this.isGreen; // && this.prevrow.c <= o

            this.exit = this.exitLimit;

            const minTP = this.entry * (1 + 0.1 / 100);
            if (o >= trail || o > minTP) {
                this.exit = o;
                is_market = true;
                isSl = false; //o > this.entry// || true;
            }
            console.log({ isSl, exit: this.exit, trail, _sl });
            if (
                this.exit != 0 &&
                (is_market || h >= this.exit) &&
                (isSl || this.exit >= _sl)
            ) {
                this.isSl = this.exit < this.entry;

                if (is_market) {
                    this.entry = o
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