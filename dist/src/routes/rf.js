"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("@/models");
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/model', async (req, res) => {
    try {
        let model = (await models_1.Test.find().exec())[0];
        if (!model) {
            model = new models_1.Test({ name: "Tonni" });
            await model.save();
        }
        model.cars.push({ name: "Honda", speed: 357 });
        await model.save();
        res.send('OK');
    }
    catch (e) {
        console.log(e);
        res.status(500).json("FUCK");
    }
});
router.get('/kline', async (req, res) => {
    try {
        const { demo } = req.query;
        const url = "https://api.bybit.com";
        const testnet = "https://api-testnet.bybit.com";
        const _url = demo == 'true' ? testnet : url;
        console.log({ demo, _url });
        const params = { symbol: "SOLUSDT", interval: '15', category: 'spot' };
        const _res = await axios_1.default.get(`${_url}/v5/market/kline`, { params });
        console.log(_res.data);
        res.send("OHK");
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ msg: "SOMETHING WRONG" });
    }
});
exports.default = router;
