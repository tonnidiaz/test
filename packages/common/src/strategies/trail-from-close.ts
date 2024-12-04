import { Backtest } from "./class";

export class TrailFromClose extends Backtest {
    calcExitLimit() {
        const P = 1.5 / 100;
        this.exitLimit = this.prevrow.c * (1 + P);
    }
    calcEntryLimit() {
        this.entryLimit = this.prevrow.c * (1 - .05 / 100);
    }
    inloop({ i }: { i: number }): void {
        console.log("inloop");

        if (!this.pos && this.entryLimit) {
            if (this.prevrow.l <= this.entryLimit) {
                // Place a market buy order and place a sell order above the prev close
                this._fillBuy({
                    amt: this.balance,
                    _entry: this.entryLimit,
                    _row: this.prevrow,
                });
            } else {
                this.calcEntryLimit();
            }
        }
        if (this.pos) {
            this.calcExitLimit();
            let exit;
            const _row = this.row;
            const { o, h, l, c } = _row;
            const TRAIL = .5 / 100;
            const trail = h * (1 - TRAIL);
            const TP = 3.5;
            const minTP = o * (1 + TP / 100);
            
            const SL = 2.5
            const sl = this.entry * (1 - SL / 100)

            const isSl = this.isGreen
            // if (minTP >= sl && h >= minTP){
            //     exit = minTP
                
            // }else if (c >= this.entry * (1 + .5 / 100)){
            //     exit = c
            // }

            if (trail >= minTP && h >= minTP){
                exit = Math.max(c, false ? trail : minTP)// true ? minTP : trail
            }

            

            if (exit){
                this.exit = exit
                console.log({entry: this.entry});
                this._fillSell({_exit: exit, _row, _base: this.base})
            }
            return;
        }

        if (!this.pos && this.buyCond(this.prevrow)) {
            this.calcEntryLimit();
        }
    }
}
