"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = void 0;
const constants_1 = require("@/utils/constants");
const def_1 = require("./def");
let _cnt = 0;
const d = constants_1.useSwindLow ? 20 : 0;
const strategy = ({ df, balance, buyCond, sellCond, lev = 1, pair, maker = constants_1.MAKER_FEE_RATE, taker = constants_1.TAKER_FEE_RATE, trades, platNm, }) => {
    const defTester = new def_1.DefTester({
        df,
        balance,
        buyCond,
        sellCond,
        lev,
        pair,
        maker,
        taker,
        trades,
        platNm,
    });
    return defTester.run();
};
exports.strategy = strategy;
/*

{
    df,
    balance,
    buyCond,
    sellCond,
    lev = 1,
    pair,
    maker = MAKER_FEE_RATE,
    taker = TAKER_FEE_RATE,
    trades,
    platNm,
}

*/ 
