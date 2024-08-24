"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategy = void 0;
const constants_1 = require("@/utils/constants");
const funcs_test_no_class_1 = require("./funcs-test-no-class");
const def_1 = require("./def");
const def_60_1 = require("./def-60");
let _cnt = 0;
const d = constants_1.useSwindLow ? 20 : 0;
const strategy = ({ df, balance, buyCond, sellCond, lev = 1, pair, maker = constants_1.MAKER_FEE_RATE, taker = constants_1.TAKER_FEE_RATE, trades, platNm, }) => {
    const params = {
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
    };
    const useNoClass = false, useDef5 = false;
    let Fn, res;
    if (useNoClass) {
        res = (0, funcs_test_no_class_1.strategy)(params);
    }
    else {
        if (useDef5) {
            Fn = def_1.DefTester;
        }
        else {
            Fn = def_60_1.DefTester60;
        }
        res = new Fn(params).run();
    }
    return res;
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
