"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Impr5 = void 0;
const functions_1 = require("@/utils/functions");
const class_1 = require("./class");
class Impr5 extends class_1.Backtest {
    inloop({ i }) {
        console.log("inloop");
        const _row = this.row;
        const { h, c, o, l, v } = _row;
        const TRAIL = 0.1; // .1
        const trail = (0, functions_1.ceil)(this.prevrow.h * (1 - TRAIL / 100), this.pricePrecision);
        if (!this.pos && this.buyCond(this.prevrow, this.df, i)) {
            console.log("\nKAYA RA BUY\n");
            this.enterTs = this.row.ts;
            console.log(`HAS BUY SIGNAL...`);
            let m = this.minSz;
            this.entry = this.row.o;
            if (o < trail && this.prevrow.c <= this.prevrow.o
            //&& (l < o || (v > 0 && o == h && l == o && c == o))
            ) {
                this.entryLimit = o;
                const _entry = false ? h : this.entry;
                this._fillBuy({
                    amt: this.balance,
                    _row: this.row,
                    _entry: _entry,
                });
            }
            else {
                console.log("CANNOT BUY");
            }
            /// if (!this.isGreen) return;
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
            let SL = .5; //_sell ? 1 : .5; //.5//1.2;
            const _sl = (0, functions_1.ceil)(this.entry * (1 - SL / 100), this.pricePrecision);
            const isO = this.prevrow.h == Math.max(this.prevrow.c, this.prevrow.o);
            isSl = !this.isGreen; //_sell || true;            
            let is_market = false;
            const TP = 1;
            const minTP = this.entry * (1 + TP / 100);
            const openCond = (o >= trail && isO)
                || o >= minTP;
            if (false) {
            }
            else if (openCond) {
                if (o < minTP) {
                    const E = !this.isGreen ? 2 : o;
                    this.exit = o * (1 + E / 100);
                    //isSl = true
                    is_market = E == 0;
                }
                else {
                    this.exit = o; // * (1 + .2)
                    is_market = true;
                }
                //isSl = false
            }
            else {
                this.exit = this.exitLimit;
                isSl = true;
            }
            const exit = this.exit;
            console.log({ isSl, exit: this.exit, trail, _sl });
            if (this.exit != 0 &&
                (is_market || (h >= exit // || (h >= exit && v > 0 && h == o && l == o && c ==o )
                )) &&
                (isSl || this.exit >= _sl)) {
                this.isSl = this.exit < this.entry;
                if (is_market) {
                    this.exitLimit = o;
                    console.log("FILLING MARKET SELL ORDER AT OPEN");
                    //if (WCS1) this.exit = l
                    this._fillSell({ _base: this.base, _exit: this.exit, _row, isSl: this.isSl });
                }
                else {
                    console.log("FILLING LIMIT SELL ORDER");
                    this.sell_order_filled = true;
                    this.amt_sold = this.base;
                }
            }
        }
    }
}
exports.Impr5 = Impr5;
//# sourceMappingURL=impr-5.js.map