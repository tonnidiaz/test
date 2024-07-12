import express from "express";
import {
    genToken,
    getCoinPrecision,
    getPricePrecision,
    readJson,
    toFixed,
    tunedErr,
} from "../utils/functions";
var router = express.Router();
import os from "os";
import { strategies } from "@/strategies";
import { chandelierExit, parseKlines } from "@/utils/funcs2";
import fs, { writeFileSync } from "fs";
import { heikinAshi } from "../utils/funcs2";
import { Bot } from "@/models";
import { OKX } from "@/classes/okx";
import { BotSchema, IBot } from "@/models/bot";
import { Bybit } from "@/classes/bybit";
import { ensureDirExists } from "@/utils/orders/funcs";
import { platforms } from "@/utils/constants";
import { TestOKX } from "@/classes/test-platforms";

const fp = false
    ? "src/data/klines/binance/2021/DOGEUSDT_15m.json"
    : "src/data/BTCUSDT.json";

/* GET home page. */
router.get("/", function (req, res, next) {
    console.log(os.arch());
    res.render("index", { title: "Express" });
});

router.get("/strategies", (req, res) => {
    res.json(strategies);
});
router.get("/platforms", (req, res) => {
    res.json(platforms);
});

router.get("/test", async (req, res) => {
    const { q, id, bs, cy, algoId } = req.query;
    const bot = new Bot({
        base: bs ?? "UMA",
        ccy: cy ?? "USDT",
        name: "TBot",
        platform: "okx",
        order_type: "Market",
    });
    const plat = bot.platform == "bybit" ? new Bybit(bot) : new OKX(bot);
    const side: string = "sell";
    const pxPr = getPricePrecision([bot.base, bot.ccy], bot.platform);
    const szPr = 2//getCoinPrecision([bot.base, bot.ccy], "sell", bot.platform);
    let px = side == 'sell' ? 0.08973 : 0.08100; //0.07961
    let sz = side == "buy" ? 15 / px : 60;
    const oid = "1615261603501297664";
    const sl = toFixed(0.08759, pxPr)//toFixed(px * (1 + ((side == 'sell' ? -.05/100 : .05/100))), pxPr)
    px = toFixed(px, pxPr);
    sz = toFixed(sz, szPr);
    
    const isAlgo = algoId ? true : false
    const _id = (isAlgo ? algoId : id) ?? oid


    const r =
        q == "place"
            ? await plat.placeOrder(sz, px, side as any, sl, Date.now().toString())
            : await plat.getOrderbyId(_id as string, isAlgo); //placeOrder(43.415972599999996, undefined, "sell")
    console.log(r);
    res.json({});
});

router.get('/trades', async (req, res)=>{
    const  {start, end, symbol} = req.query as any
    const plat = new TestOKX()
    const ret = await plat.getTrades({start, symbol, end})
    console.log(ret);
    res.send("OK")
})
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

router.post("/lev", async (req, res) => {
    try {
        const { body } = req;
        const bot = (await Bot.find().exec())[0];
        const okx = new OKX(bot!);
        const ret = await okx.setLev(Number(body.val));
        res.send("OK");
    } catch (error) {
        console.log(error);
        return tunedErr(res, 500, "Something went wrong");
    }
});
export default router;
