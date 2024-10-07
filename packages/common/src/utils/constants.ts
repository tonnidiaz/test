import { configDotenv } from "dotenv";
import { Job } from "node-schedule";
configDotenv();
export const DEV = process.env.ENV == "dev";
console.log(process.env.ENV);

export let jobs: { job: Job; id: string; active: boolean }[] = [];
export const setJobs = (val: typeof jobs) => (jobs = val);

export let bookJobs: { job: Job; id: string; active: boolean }[] = [];
export const setBookJobs = (val: typeof bookJobs) => (bookJobs = val);

export const test = false;
export const botJobSpecs = (min: number) =>
    min == 60 ? "0 * * * *" : `*/${min} * * * *`; // = test ? "*/10 * * * * *" : "* * * * * *";
export const dfsDir = "src/data/dfs/binance",
    klinesDir = "src/data/klines/binance";

export const MAKER_FEE_RATE = 0.1 / 100;
export const TAKER_FEE_RATE = 0.1 / 100,
    P_DIFF = 0.0 / 100;
export const slPercent = 0.5 / 100,
    minDiff = 0;
export const dfsRootDir = "src/data/dfs",
    klinesRootDir = "src/data/klines",
    tradesRootDir = "src/data/trades";

export const isMarket = true,
    cancelOnCond = true,
    useHaClose = false,
    isStopOrder = false,
    useSwindLow = false,
    noFees = false,
    usePricePc = false,
    useCurrRow = true,
    useProdPercs = false;

const interval = 15;
export const stops = {
    60: 15,
    30: 0.8,
    15: 0.5, //0.5,
    5: 0.5, //0.25,
};
export let SL = 1; //stops[interval]; //7//.01//1//.25//7//3; //.002//.02//.015//.05//useProdPercs ? .03 : .01//0.03//0.05; //.25//.5,
export let TP = 3.5; //5.5//3.5//.5//0.5; //5//1.7//10//15//5.5//9.5//1; //.2//.3//1.1//1.7//useProdPercs ? 1.5 : 1.7//1.5//2//1.5; // 3.5//5.3
export const SL2 = 0.25; //1
export const setSL = (v: number) => (SL = v);
export const setTP = (v: number) => (TP = v);
export const MAX_PEC_FROM_H = 0.5;
export const checkGreen = false,
    rf = false,
    slFirstAlways = true;

export const WCS1 = true,
    WCS2 = true;

export const useAnyBuy = false;
const largeStop = false;

const trails = {
    60: 1,
    30: 0.6,
    15: 0.25 /* 0.15 */,
    5: 0.5 /* .01 */,
    3: 0.12,
    1: 0.12,
};

export const getTrailingStop = (interval: number) => {
    return trails[interval];
};

export const TRAILING_STOP_PERC = 0.1; //getTrailingStop(interval);
export const MAX_PROFIT_PERC = (5000000 * 100) / 1000;

export const SELL_AT_LAST_BUY = false,
    PUT_ASIDE = false;

export const ETH_RATE = 2000,
    XRP_WITHDRAW_FEE = 0.25;

export const ARBIT_ZERO_FEES = false,
    IMMEDIATE_SELL = false;
export const MAX_QUOTE = 100000000,
    ARBIT_MIN_PERC = 0.3;

export const useWS = true;
