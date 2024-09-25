import { ceil, toFixed } from "@/utils/functions";
import { Backtest } from "./class";
import { isMarket, WCS1 } from "@/utils/constants";

export class Impr5 extends Backtest {
    inloop({ i }: { i: number }): void {
        console.log("inloop");

        if (!this.pos && this.entryLimit) {
            const _row = this.prevrow;
            if (_row.l < this.entryLimit) {
                const SLIP = _row.l < this.entryLimit ? 0 : .5/100
                this.entry = this.entryLimit * (1 + SLIP);
                const _entry = this.entry;
                this._fillBuy({
                    amt: this.balance,
                    _row,
                    _entry: _entry,
                });
            }
        } if (this.pos && this.exitLimit) {
            const _row = this.prevrow;
            if (_row.h > this.exitLimit) {
                const SLIP = _row.h > this.exitLimit ? 0 : .5/100
                this.exit = this.exitLimit * (1 - SLIP);
                this.exit = toFixed(this.exit, this.pricePrecision);
                this.isSl = this.exit < this.entry;
                this._fillSell({
                    _base: this.base,
                    _exit: this.exit,
                    _row,
                    isSl: this.isSl,
                });
            }
        }

        if (!this.pos && this.entryLimit){
            
            this.entryLimit = Math.min(this.prevrow.c); 
            return
        }
        if (!this.pos && this.buyCond(this.prevrow, this.df, i)) {
            console.log("\nKAYA RA BUY\n");
            this.enterTs = this.row.ts;
            console.log(`HAS BUY SIGNAL...`);
            let m = this.minSz;

            if (this.prevrow.v > 0 || true) {
                this.entryLimit = Math.min(this.prevrow.c) * (1 - .1/100); //o;
            }

            //return;
        }

        if (this.pos
            //  && this.sellCond(this.prevrow, this.entry)
        ) {
            const TRAIL = 0.5; // .1
            const trail = ceil(
                this.prevrow.h * (1 - TRAIL / 100),
                this.pricePrecision
            );
            this.enterTs = this.row.ts;
            console.log("HAS POS");
            const e = Math.max(this.prevrow.o, this.prevrow.c);
            this.exitLimit = e * (1 + 3.5 / 100);
            this.exitLimit = toFixed(this.exitLimit, this.pricePrecision);
            this.exit = 0;

            let isSl = false;
            let SL = 5;

            const _sl = ceil(this.entry * (1 - SL / 100), this.pricePrecision);
            const isO =
                this.prevrow.h == Math.max(this.prevrow.c, this.prevrow.o);

            let is_market = false;

            const TP = 3.5;
            const minTP = this.entry * (1 + TP / 100);
            const openCond =
                (this.prevrow.c >= trail && isO) || this.prevrow.c >= minTP;

            this.exitLimit = openCond
                ? Math.max(minTP, this.exitLimit)
                : this.exitLimit;
            isSl = this.isGreen; //!openCond;
            if (!isSl && this.exitLimit < _sl) {
                this.exitLimit = _sl; // * (1 + .15/100)
            }

            // const exit = this.exit;

            // console.log({ isSl, exit: this.exit, trail, _sl });

            // if (
            //     this.exit != 0 &&
            //     (is_market || h > exit) &&
            //     (isSl || this.exit >= _sl)
            // ) {
            //     if (this.exit > o) {
            //         console.log("EXIT > O");
            //     } else {
            //         console.log("EXIT <= O");
            //     }
            //     this.isSl = this.exit < this.entry;

            //     if (is_market) {
            //         this.exitLimit = o;
            //         console.log("FILLING MARKET SELL ORDER AT OPEN");
            //         //if (WCS1) this.exit = l
            //         this._fillSell({
            //             _base: this.base,
            //             _exit: this.exit,
            //             _row,
            //             isSl: this.isSl,
            //         });
            //     } else {
            //         console.log("FILLING LIMIT SELL ORDER");
            //         this.sell_order_filled = true;
            //         this.amt_sold = this.base;
            //     }
            // }
        }
    }
}
