"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Strategy = void 0;
const strategies_1 = require("@/strategies");
const constants_1 = require("@/utils/constants");
class Strategy {
    name = "";
    desc = "";
    buyCond(...args) {
        return false;
    }
    sellCond(row, entry, df, i) {
        return false;
    }
    run({ df, balance, lev = 1, pair, maker = constants_1.MAKER_FEE_RATE, taker = constants_1.TAKER_FEE_RATE, platNm, trades, parent, }) {
        console.log(`\nRunning ${this.name} strategy [${this.desc}] \t ${pair}\n`);
        // const mData = strategy({
        //     df,
        //     balance,
        //     buyCond: this.buyCond,
        //     sellCond: this.sellCond,
        //     pair,
        //     lev,
        //     maker,
        //     taker,
        //     trades,
        //     platNm,
        // });
        const params = {
            df,
            balance,
            buyCond: this.buyCond,
            sellCond: this.sellCond,
            pair,
            lev,
            maker,
            taker,
            trades,
            platNm,
        };
        const Fn = new strategies_1.parentStrategies[parent](params);
        const mData = Fn.run();
        return mData;
    }
    toJson() {
        let o = {};
        for (let k of Object.keys(this)) {
            o[k] = this[k];
        }
        return o;
    }
}
exports.Strategy = Strategy;
