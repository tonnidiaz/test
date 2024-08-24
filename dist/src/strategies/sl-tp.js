"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategies = void 0;
const strategy_1 = require("@/classes/strategy");
class Str4 extends strategy_1.Strategy {
    name = "Strategy 4";
    desc = `Exists TP is 5% or < sl (swing low of last 50 candles)`;
    buyCond(row) {
        return row['buy_signal'] == 1 && (row['sma_20'] && row['sma_50'] && row['sma_20'] > row['sma_50']);
    }
    sellCond(row, entry, df, i) {
        i += 1;
        const last50Candles = df.slice(i - 50, i);
        const lastSwingLow = Math.min(...last50Candles.map(e => e.l));
        const sl = lastSwingLow;
        console.log(this);
        const tp = entry * (1 + (5 / 100));
        console.log(`Stop loss: ${sl} \t TP: ${tp}`);
        return row['c'] >= tp || row.c <= sl; //|| (row['sell_signal'] && row['sma_20'] < row['sma_50'])
    }
}
class Str5 extends strategy_1.Strategy {
    name = "Strategy 5";
    desc = `Exits on sell signal or < sl (swing low of last 50 candles)`;
    buyCond(row) {
        return row['buy_signal'] == 1 && (row['sma_20'] && row['sma_50'] && row['sma_20'] > row['sma_50']);
    }
    sellCond(row, entry, df, i) {
        i += 1;
        const last50Candles = df.slice(i - 50, i);
        const lastSwingLow = Math.min(...last50Candles.map(e => e.l));
        const sl = lastSwingLow;
        return row['sell_signal'] == 1 || row.c <= sl;
    }
}
class Str6 extends strategy_1.Strategy {
    name = "Strategy 6";
    desc = `Exits on sell signal && sma_20 < sma_50 or < sl (swing low of last 50 candles)`;
    buyCond(row) {
        return row['buy_signal'] == 1 && (row['sma_20'] && row['sma_50'] && row['sma_20'] > row['sma_50']);
    }
    sellCond(row, entry, df, i) {
        i += 1;
        const last50Candles = df.slice(i - 50, i);
        const lastSwingLow = Math.min(...last50Candles.map(e => e.l));
        const sl = lastSwingLow;
        return (row['sell_signal'] == 1 && row['sma_20'] < row['sma_50']) || row.c <= sl;
    }
}
class Str7 extends strategy_1.Strategy {
    name = "Strategy 7";
    desc = `sma_20 < sma_50 or < sl (swing low of last 50 candles)`;
    buyCond(row) {
        return row['buy_signal'] == 1 && (row['sma_20'] && row['sma_50'] && row['sma_20'] > row['sma_50']);
    }
    sellCond(row, entry, df, i) {
        i += 1;
        const last50Candles = df.slice(i - 50, i);
        const lastSwingLow = Math.min(...last50Candles.map(e => e.l));
        const sl = lastSwingLow;
        return (row['sma_20'] < row['sma_50']) || row.c <= sl;
    }
}
class Str8 extends strategy_1.Strategy {
    name = "Strategy 8";
    desc = `Exists TP is 5% or < sl (swing low of last 10 candles)`;
    buyCond(row) {
        return row['buy_signal'] == 1 && (row['sma_20'] && row['sma_50'] && row['sma_20'] > row['sma_50']);
    }
    sellCond(row, entry, df, i) {
        i += 1;
        const last50Candles = df.slice(i - 10, i);
        const lastSwingLow = Math.min(...last50Candles.map(e => e.l));
        const sl = lastSwingLow;
        console.log(this);
        const tp = entry * (1 + (5 / 100));
        console.log(`Stop loss: ${sl} \t TP: ${tp}`);
        return row['c'] >= tp || row.c <= sl; //|| (row['sell_signal'] && row['sma_20'] < row['sma_50'])
    }
}
class Str9 extends strategy_1.Strategy {
    name = "Strategy 9";
    desc = `Exits on sell signal or < sl (swing low of last 10 candles)`;
    buyCond(row) {
        return row['buy_signal'] == 1 && (row['sma_20'] && row['sma_50'] && row['sma_20'] > row['sma_50']);
    }
    sellCond(row, entry, df, i) {
        i += 1;
        const last50Candles = df.slice(i - 10, i);
        const lastSwingLow = Math.min(...last50Candles.map(e => e.l));
        const sl = lastSwingLow;
        return row['sell_signal'] == 1 || row.c <= sl;
    }
}
class Str10 extends strategy_1.Strategy {
    name = "Strategy 10";
    desc = `Exits on sell signal && sma_20 < sma_50 or < sl (swing low of last 10 candles)`;
    buyCond(row) {
        return row['buy_signal'] == 1 && (row['sma_20'] && row['sma_50'] && row['sma_20'] > row['sma_50']);
    }
    sellCond(row, entry, df, i) {
        i += 1;
        const last50Candles = df.slice(i - 10, i);
        const lastSwingLow = Math.min(...last50Candles.map(e => e.l));
        const sl = lastSwingLow;
        return (row['sell_signal'] == 1 && row['sma_20'] < row['sma_50']) || row.c <= sl;
    }
}
class Str11 extends strategy_1.Strategy {
    name = "Strategy 11";
    desc = `sma_20 < sma_50 or < sl (swing low of last 10 candles)`;
    buyCond(row) {
        return row['buy_signal'] == 1 && (row['sma_20'] && row['sma_50'] && row['sma_20'] > row['sma_50']);
    }
    sellCond(row, entry, df, i) {
        i += 1;
        const last50Candles = df.slice(i - 10, i);
        const lastSwingLow = Math.min(...last50Candles.map(e => e.l));
        const sl = lastSwingLow;
        return (row['sma_20'] < row['sma_50']) || row.c <= sl;
    }
}
exports.strategies = [];
