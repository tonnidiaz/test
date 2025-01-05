import { tuErr } from "@/lib/server/funcs";
import { Bot, TriArbitOrder, TuOrder } from "@cmn/models/index.js";
import { parseArbitOrder } from "@cmn/utils/funcs3.js";
import type { IObj } from "@cmn/utils/interfaces";
import { json } from "@sveltejs/kit";

export const GET = async ({request: req, url}) =>{

    let {page, bot, limit} = Object.fromEntries(url.searchParams)
        const _limit = Number(limit) || 100
        const _page = Number(page) || 1
        const skip = (_page - 1) * _limit;
        
        if (!bot){return tuErr(400, "{bot} param required")}
        const _bot = await Bot.findById(bot).exec()
        if (!_bot) {return tuErr(404, "Bot bot found")}
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

        return json(orders)
}