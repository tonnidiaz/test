
const { RestClientV5 } = require("bybit-api");

var express = require('express');
const { BYBIT_API_KEY_DEV, BYBIT_API_KEY, BYBIT_API_SECRET_DEV, BYBIT_API_SECRET } = require('../utils/consts');
var router = express.Router();


/* GET home page. */
router.get('/kline', async function(req, res, next) {
    let { demo } = req.query

    demo = demo == 'true'
    const API_KEY = demo ? BYBIT_API_KEY_DEV : BYBIT_API_KEY
    const API_SECRET = demo ? BYBIT_API_SECRET_DEV : BYBIT_API_SECRET
    const baseURL = demo ? "https://api-testnet.bybit.com" : "https://api.bytick.com"
    try{
        console.log({demo})
        const client = new RestClientV5({key: API_KEY, secret: API_SECRET, demoTrading: demo, testnet: demo})

        const symbol = "SOLUSDT", interval= 5, category = 'spot';

        const r = await client.getKline({symbol, interval, category})
        console.log(r.result)
        res.json(r.result)
    }
    catch(e){
        console.log(e)
        res.status(500).json({msg: "500"})
    }
});

module.exports = router;
