import { Test } from "@/models";
import { test_platforms } from "@/utils/consts";
import { tunedErr } from "@/utils/functions";
import axios from "axios";
import { Router } from "express";

const router = Router()

router.post('/model', async (req, res)=>{
    try{
let model = (await Test.find().exec())[0]
    if (!model){
        model = new Test({name: "Tonni"})
        await model.save()
    }

    model.cars.push({name: "Honda", speed: 357})
    await model.save()
    res.send('OK')
    }
    catch(e){
        console.log(e);
        res.status(500).json("FUCK")
    }

})

router.get('/kline', async (req, res)=>{
    try{
        const { demo } = req.query
        const url = "https://api.bybit.com"
        const testnet = "https://api-testnet.bybit.com"
        const _url = demo == 'true' ? testnet : url
        console.log({demo, _url})
        const params = {symbol: "SOLUSDT", interval: '15', category: 'spot'}
        const _res = await axios.get(`${_url}/v5/market/kline`, {params})
        console.log(_res.data)
     res.send("OHK")
    }
    catch(e){
        console.log(e)
        res.status(500).json({msg: "SOMETHING WRONG"})
    }
})

router.get('/nets', async(req, res)=>{
    try {
        const {plat: platname, offline} = req.query
        const Plat = new test_platforms[platname as any]({demo: false, name: platname as any})
        const r = await Plat.getNets(undefined, offline == 'true')
        res.json(r)
    } catch (e) {
        console.log(e);
        return tunedErr(res, 500, 'Something went wrong')
    }
})
export default router

