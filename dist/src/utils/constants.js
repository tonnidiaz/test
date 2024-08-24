"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ETH_RATE = exports.PUT_ASIDE = exports.SELL_AT_LAST_BUY = exports.MAX_PROFIT_PERC = exports.TRAILING_STOP_PERC = exports.getTrailingStop = exports.useAnyBuy = exports.WCS2 = exports.WCS1 = exports.slFirstAlways = exports.rf = exports.checkGreen = exports.MAX_PEC_FROM_H = exports.setTP = exports.setSL = exports.SL2 = exports.TP = exports.SL = exports.stops = exports.useProdPercs = exports.useCurrRow = exports.usePricePc = exports.noFees = exports.useSwindLow = exports.isStopOrder = exports.useHaClose = exports.cancelOnCond = exports.isMarket = exports.tradesRootDir = exports.klinesRootDir = exports.dfsRootDir = exports.platforms = exports.minDiff = exports.slPercent = exports.P_DIFF = exports.TAKER_FEE_RATE = exports.MAKER_FEE_RATE = exports.klinesDir = exports.dfsDir = exports.botJobSpecs = exports.test = exports.setJobs = exports.jobs = exports.DEV = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
exports.DEV = process.env.ENV == "dev";
console.log(process.env.ENV);
exports.jobs = [];
const setJobs = (val) => (exports.jobs = val);
exports.setJobs = setJobs;
exports.test = false;
const botJobSpecs = (min) => min == 60 ? "0 * * * *" : `*/${min} * * * *`; // = test ? "*/10 * * * * *" : "* * * * * *";
exports.botJobSpecs = botJobSpecs;
exports.dfsDir = "src/data/dfs/binance", exports.klinesDir = "src/data/klines/binance";
exports.MAKER_FEE_RATE = 0.1 / 100;
exports.TAKER_FEE_RATE = 0.1 / 100, exports.P_DIFF = 0.0 / 100;
exports.slPercent = 0.5 / 100, exports.minDiff = 0;
exports.platforms = ["bybit", "okx"];
exports.dfsRootDir = "src/data/dfs", exports.klinesRootDir = "src/data/klines", exports.tradesRootDir = "src/data/trades";
exports.isMarket = true, exports.cancelOnCond = true, exports.useHaClose = false, exports.isStopOrder = false, exports.useSwindLow = false, exports.noFees = false, exports.usePricePc = false, exports.useCurrRow = true, exports.useProdPercs = false;
const interval = 15;
exports.stops = {
    60: 15,
    30: 0.8,
    15: .5, //0.5, 
    5: .5 //0.25,
};
exports.SL = 1; //stops[interval]; //7//.01//1//.25//7//3; //.002//.02//.015//.05//useProdPercs ? .03 : .01//0.03//0.05; //.25//.5,
exports.TP = 3.5; //5.5//3.5//.5//0.5; //5//1.7//10//15//5.5//9.5//1; //.2//.3//1.1//1.7//useProdPercs ? 1.5 : 1.7//1.5//2//1.5; // 3.5//5.3
exports.SL2 = 0.25; //1
const setSL = (v) => (exports.SL = v);
exports.setSL = setSL;
const setTP = (v) => (exports.TP = v);
exports.setTP = setTP;
exports.MAX_PEC_FROM_H = 0.5;
exports.checkGreen = false, exports.rf = false, exports.slFirstAlways = true;
exports.WCS1 = true, exports.WCS2 = true;
exports.useAnyBuy = false;
const largeStop = false;
const trails = {
    60: 1,
    30: 0.6,
    15: .25 /* 0.15 */,
    5: 0.5 /* .01 */,
    3: 0.12,
    1: 0.12,
};
const getTrailingStop = (interval) => {
    return trails[interval];
};
exports.getTrailingStop = getTrailingStop;
exports.TRAILING_STOP_PERC = .1; //getTrailingStop(interval);
exports.MAX_PROFIT_PERC = (5000000 * 100) / 1000;
exports.SELL_AT_LAST_BUY = true, exports.PUT_ASIDE = false;
exports.ETH_RATE = 2000;
