import { ceil } from "@/utils/functions";
import { Backtest } from "./class";

export class DefTester extends Backtest {
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
            const e =  Math.max(this.prevrow.o, this.prevrow.c);
            this.exitLimit = e * (1 + 2.5 / 100);
            const _row = this.row;

            const { h, c, o } = _row;
            this.exit = 0;
            
            this.exit = this.exitLimit;

            console.log({ exit: this.exit });

            if (this.exit != 0 && h >= this.exit) {
                this.isSl = this.exit < this.entry;
                console.log("FILLING LIMIT SELL ORDER");
                this.sell_order_filled = true;
                this.amt_sold = this.base;
            }
        }
    }
}
