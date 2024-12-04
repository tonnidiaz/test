import { Bot } from "@cmn/models/index.js";
import { error } from "@sveltejs/kit"
import { deleteBot } from "./methods.js";
import { handleErrs } from "@cmn/utils/functions.js";

export const POST = async ({request: req, params})=>{
    try {
        const {id, endpoint} = params
        
        const bot = await Bot.findById(id).exec();
        console.log({id, endpoint});
        const body = await req.json();
        console.log({body});
        if (!bot) return error(400, "BOT NOT FOUND");
        let r: any;
        
        switch (endpoint){
            case "delete":
                r =  await deleteBot({body, bot});
                break
        }
        return r
    } catch (err) {
        handleErrs(err)
        return error(500, "Something went wrong")
    }
}