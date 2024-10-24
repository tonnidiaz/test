import { TestBitget } from "@cmn/classes/test-bitget";
import { Bot } from "@cmn/models";
import { parentStrategies, strategies } from "@cmn/strategies";
import { genToken } from "@cmn/utils/bend/functions";
import { test_platforms } from "@cmn/utils/consts";
import { objPlats } from "@cmn/utils/consts2";
import { parseKlines } from "@cmn/utils/funcs2";
import { onCointest, onBacktest } from "@cmn/utils/functions/io-funcs";
import express from "express";

const router = express.Router();

const fp = false
    ? "src/data/klines/binance/2021/DOGEUSDT_15m.json"
    : "src/data/BTCUSDT.json";

/* GET home page. */
router.get("/", function (req, res, next) {
    res.render("index", { title: "Express" });
});

router.get("/strategies", (req, res) => {
    res.json(strategies);
});
router.get("/platforms", (req, res) => {
    res.json(Object.keys(test_platforms));
});
router.get("/parents", (req, res) => {
    res.json(Object.keys(parentStrategies));
});

router.post("/coins", async (req, res) => {
    const ret = await onCointest(req.body);
    if (typeof ret == "string") {
        res.status(500).send(ret);
        return;
    }
    res.json(ret);
});

router.get("/kline", async (req, res) => {
    const bot = new Bot({
        name: "TUBOT",
        start_amt: 10,
        base: "SOL",
        ccy: "USDT",
        platform: "bybit",
        interval: 5,
    });
    const { plat } = req.query;

    const _plat = new objPlats[plat as any](bot);
    const kline = await _plat.getKline();
    res.json(parseKlines([kline]));
});
router.get("/test", async (req, res) => {
    const { q, id, bs, cy, algoId } = req.query;

    const plat = new TestBitget({});

    try {
        const klines = await plat.getKlines({
            symbol: "SOLUSDT",
            interval: 60,
            start: Date.parse("2024-01-01 00:00:00+02:00"),
            end: Date.parse("2024-03-28 23:59:00+02:00"),
        });
        const df = parseKlines(klines ?? []);
        console.log(df[df.length - 1]);
    } catch (e) {
        console.log(e);
    } finally {
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

        const token = genToken(data);
        res.send(token);
    } catch (e) {
        console.log(e);
        res.status(500).send("swr");
    }
});

router.get("/backtest", async (req, res) => {
    const _res = await onBacktest(req.body);
    res.json(_res);
});
export default router;
