
import { Bot, TriArbitOrder, TuOrder } from "@cmn/models";
import { tunedErr } from "@cmn/utils/bend/functions";
import { parseArbitOrder } from "@cmn/utils/funcs3";
import { IObj } from "@cmn/utils/interfaces";
import express from "express";


var router = express.Router();
router.get('/', async (req, res)=>{
    try {
        let {page, bot, limit} = req.query
        const _limit = Number(limit) || 100
        const _page = Number(page) || 1
        const skip = (_page - 1) * _limit;
        
        if (!bot){return tunedErr(res, 400, "{bot} param required")}
        const _bot = await Bot.findById(bot).exec()
        if (!_bot) {return tunedErr(res, 404, "Bot bot found")}
        const orders: IObj[] = []

        if (_bot.type == 'arbitrage'){
            const ords = await TriArbitOrder.find({bot: _bot.id})
          .skip(skip)
          .limit(_limit)
          .exec();
          orders.push(...(await Promise.all(ords.map(parseArbitOrder))).map(el=>el.order ?? {}))
        }else{
            const ords = await TuOrder.find({bot: _bot.id, is_arbit: _bot.is_child})
          .skip(skip)
          .limit(_limit)
          .exec();
          orders.push(...ords)
        }
        //console.log('\n',{len: orders.length, last: [...orders].pop()?.a?._id})
        res.json(orders)

    } catch (err) {
        console.log(err)
        tunedErr(res, 500, "Failed to get orders")
    }
})
export default router