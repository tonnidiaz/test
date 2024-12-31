import { Bot } from "@cmn/models/index.js";
import { deleteBot } from "./methods.js";
import { handleErrs } from "@cmn/utils/functions.js";
import { tuErr } from "@/lib/server/funcs.js";
import { clearOrders, parseBot } from "@cmn/utils/bend/funcs.js";
import { json } from "@sveltejs/kit";

export const POST = async ({request: req, params})=>{
        const {id, endpoint} = params
        
        const bot = await Bot.findById(id).exec();
        console.log({id, endpoint});
        const body = await req.json();
        console.log({body});
        if (!bot) return tuErr(400, "BOT NOT FOUND");
        let r: any;
        
        switch (endpoint){
            case "delete":
                r =  await deleteBot({body, bot});
                break
            case "clear-orders":
                await clearOrders(bot)
                r = json(await parseBot(bot))
                break
        }
        return r
 
}