"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategies = exports.ANY = exports.RSI_ONLY = void 0;
const strategy_1 = require("@/classes/strategy");
const fastRSI = 30;
class RSI_ONLY extends strategy_1.Strategy {
    name = "RSI ONLY";
    desc = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;
    buyCond(row) {
        return (row.rsi < fastRSI);
    }
    sellCond(row) {
        return row.rsi > 100 - fastRSI;
    }
}
exports.RSI_ONLY = RSI_ONLY;
class ANY extends strategy_1.Strategy {
    name = "ANY";
    desc = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;
    buyCond(row) {
        return true;
    }
    sellCond(row) {
        return true;
    }
}
exports.ANY = ANY;
class BB_SMA extends strategy_1.Strategy {
    name = "BB_SMA";
    desc = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;
    buyCond(row) {
        const smaCond = row.sma_20 >= row.sma_50 && row.macd >= 0;
        return row.c > row.o || smaCond;
    }
    sellCond(row) {
        const smaCond = row.sma_20 <= row.sma_50 && row.macd <= 0;
        return row.c < row.o || smaCond;
    }
}
class ThreeSum extends strategy_1.Strategy {
    name = "ThreeSum";
    desc = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;
    buyCond(row, df, i) {
        const smaCond = row.buy_signal == 1 && row.sma_20 > row.sma_50;
        let bool = true;
        return smaCond && bool;
    }
    sellCond(row, entry, df, i) {
        const smaCond = row.sell_signal == 1 && row.sma_20 < row.sma_50;
        let bool = true;
        return smaCond && bool;
    }
}
exports.strategies = [new ANY()]; // [ new BB_SMA(), new ThreeSum()];
//# sourceMappingURL=ce-sma.js.map