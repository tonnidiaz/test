import type { IBot } from "@cmn/models/bot";
import { Bot, TriArbitOrder, TuOrder, User } from "@cmn/models/index.js";
import { parseBot } from "@cmn/utils/bend/funcs";
import { handleErrs } from "@cmn/utils/functions.js";
import { createChildBots } from "@cmn/utils/functions/bots-funcs.js";
import type { IObj } from "@cmn/utils/interfaces.js";
import { error, json } from "@sveltejs/kit";
import { isValidObjectId } from "mongoose";

const _createBot = async ({body} : {body: IObj}) =>{
    try{
        const bot = new Bot();
        // console.log({body});
        for (let k of Object.keys(body)) {
            bot.set(k, body[k]);
        }

        const is_arb = bot.type == "arbitrage";

        const pair: string[] = is_arb
            ? [bot.C, bot.A]
            : body.pair ?? body.symbol;

        [bot.base, bot.ccy] = pair;

        const user = await User.findOne({ username: body.user }).exec();
        if (!user) return error(400, "User account not available");
        bot.user = user.id;

        const total_quote = {
            base: bot.base,
            ccy: bot.ccy,
            amt: bot.start_bal,
        };
        bot.total_quote.push(total_quote);

        const aside = { base: bot.base, ccy: bot.ccy, amt: 0 };
        bot.aside.push(aside);

        bot.start_bal = bot.start_amt;
        bot.balance = bot.start_amt;

        if (is_arb) {
            await createChildBots(bot);
        }
        await bot.save();
        user.bots.push(bot.id);
        await user.save();
        return json(bot.toJSON());
    } catch (err) {
        handleErrs(err);
        return error(500, "Failed to create bot");
    }
}
export const POST = async ({request: req, params})=>{
    try {
        const body = await req.json();

        const {endpoint} = params
        if (endpoint == "create"){
            return _createBot({body})
        }
    }
    catch(err){
        handleErrs(err)
        return error(500, "Something went wrong")
    }
        
}




export const GET = async ({request: req,params})=>{
    try {
        const { endpoint: id } = params;
        if (isValidObjectId(id)){
           let bot = await Bot.findById(id).exec();
        if (!bot) return error(404, "Bot not found");

        const _bot = await parseBot(bot);

        return json({ ..._bot }); 
        }
        else{
            return json({id})
        }
    } catch (err) {
        handleErrs(err)
        error(500, "Failed to get bot");
    }
}