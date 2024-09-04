import { Bot, Order, TriArbitOrder } from "@/models";
import { tunedErr } from "@/utils/functions";
import express from "express";

var router = express.Router();
router.get('/', async (req, res)=>{
    try {
        let {start, bot} = req.query
        const max = 50
        const _start = Number(start ?? 0)
        if (!bot){return tunedErr(res, 400, "{bot} param required")}
        const _bot = await Bot.findById(bot).exec()
        if (!_bot) {return tunedErr(res, 404, "Bot bot found")}
        const orders: any[] = []

        const end = _start + max
        //console.log("\n", _bot.name, _bot.parent)
        if (_bot.type == 'arbitrage'){
            const ords = await TriArbitOrder.find({bot: _bot.id}).exec()
           
            for (let ord of ords.slice(_start, end)){
                ord = await ord.populate("order.a")
                ord = await ord.populate("order.b")
                ord = await ord.populate("order.c")
                orders.push(ord.order)
            }
        }else {
            
            const ords = await Order.find({bot: _bot.id, is_arbit: _bot.parent != undefined}).exec()
            for (let ord of ords.slice(_start, end)){
                //ord = await ord.populate("order.a")
                //ord = await ord.populate("order.b")
                //ord = await ord.populate("order.c")
                orders.push(ord)
            }
        }
        //console.log('\n',{len: orders.length, last: [...orders].pop()?.a?._id})
        res.json(orders)

    } catch (err) {
        console.log(err)
        tunedErr(res, 500, "Failed to get orders")
    }
})
export default router