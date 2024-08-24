"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefTester = void 0;
const functions_1 = require("@/utils/functions");
const class_1 = require("./class");
class DefTester extends class_1.Backtest {
    name = "DefTester";
    inloop({ i }) {
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
            // if (!this.isGreen) return;
        }
        if (this.pos) {
            this.enterTs = this.row.ts;
        }
        if (this.pos) {
            console.log("HAS POS");
            const _row = this.row;
            const { h, c, o } = _row;
            const e = Math.max(this.prevrow.o, this.prevrow.c);
            const tr = h * (1 - .25 / 100);
            this.exitLimit = Math.max(c, tr); // e * (1 + 2.5 / 100);
            const SL = 1.5;
            const tp = (0, functions_1.ceil)(o * (1 + 2.5 / 100), this.pricePrecision);
            this.exit = 0;
            let ex = 0;
            if (tr >= tp) {
                ex = tp;
            }
            else if (c > tr) {
                ex = c;
            }
            this.exit = ex;
            const sl = (0, functions_1.ceil)(this.entry * (1 - SL / 100), this.pricePrecision);
            console.log({ exit: this.exit, sl });
            if (this.exit != 0 && h >= this.exit && this.exit >= sl) {
                this.isSl = this.exit < this.entry;
                console.log("FILLING LIMIT SELL ORDER");
                this.sell_order_filled = true;
                this.amt_sold = this.base;
            }
        }
    }
}
exports.DefTester = DefTester;
