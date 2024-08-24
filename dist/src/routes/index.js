"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const functions_1 = require("../utils/functions");
var router = express_1.default.Router();
const os_1 = __importDefault(require("os"));
const strategies_1 = require("@/strategies");
const models_1 = require("@/models");
const consts_1 = require("@/utils/consts");
const io_funcs_1 = require("@/utils/functions/io-funcs");
const consts2_1 = require("@/utils/consts2");
const funcs2_1 = require("@/utils/funcs2");
const test_bitget_1 = require("@/classes/test-bitget");
const fp = false
    ? "src/data/klines/binance/2021/DOGEUSDT_15m.json"
    : "src/data/BTCUSDT.json";
/* GET home page. */
router.get("/", function (req, res, next) {
    console.log(os_1.default.arch());
    res.render("index", { title: "Express" });
});
router.get("/strategies", (req, res) => {
    res.json(strategies_1.strategies);
});
router.get("/platforms", (req, res) => {
    res.json(Object.keys(consts_1.platforms));
});
router.post("/coins", async (req, res) => {
    const ret = await (0, io_funcs_1.onCointest)(req.body);
    if (typeof ret == 'string')
        return res.status(500).send(ret);
    res.json(ret);
});
router.get('/kline', async (req, res) => {
    const bot = new models_1.Bot({ name: "TUBOT", start_amt: 10, base: "SOL", ccy: "USDT", platform: 'bybit', interval: 5 });
    const { plat } = req.query;
    const _plat = new (consts2_1.objPlats[plat])(bot);
    const kline = await _plat.getKline();
    res.json((0, funcs2_1.parseKlines)([kline]));
});
router.get("/test", async (req, res) => {
    const { q, id, bs, cy, algoId } = req.query;
    const plat = new test_bitget_1.TestBitget({});
    try {
        const klines = await plat.getKlines({ symbol: 'SOLUSDT', interval: 60, start: Date.parse("2024-01-01 00:00:00+02:00"), end: Date.parse("2024-03-28 23:59:00+02:00") });
        const df = (0, funcs2_1.parseKlines)(klines ?? []);
        console.log(df[df.length - 1]);
    }
    catch (e) {
        console.log(e);
    }
    finally {
        res.json({});
    }
});
router.get("/trades", async (req, res) => {
    /* const ret = await plat.getTrades({start: Date.parse(start), symbol, end: end ? Date.parse(end) : end})
    if (ret){
        return res.json(ret.map(el=>({...el, ts: parseDate(new Date(Number(el.ts)))})));
    } */
    res.send("OK");
});
router.post("/encode", async (req, res) => {
    try {
        const data = req.body;
        console.log(data);
        const token = (0, functions_1.genToken)(data);
        res.send(token);
    }
    catch (e) {
        console.log(e);
        res.status(500).send("swr");
    }
});
router.get("/backtest", async (req, res) => {
    const _res = await (0, io_funcs_1.onBacktest)(req.body);
    res.json(_res);
});
exports.default = router;
