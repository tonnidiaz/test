import { triArbitWsList, crossArbitWsList } from "@cmn/classes/tu-ws";
import { IBot } from "@cmn/models/bot";
import { botLog } from "@cmn/utils/bend/functions";
import { Response } from "express";
export const tunedErr = (res: Response, status: number, msg: string, e?: any) => {
    if (e) {
        console.log(e);
    }
      res.status(status).send(`tu:${msg}`);
      return null
}; 

export const addBotToArbitWs = async (bot: IBot) => {
    const { arbit_settings: settings } = bot;
    if (bot.type == "arbitrage" && bot.active && settings?.use_ws) {
        botLog(bot, "Adding bot to ArbitWs...")
        if (settings?._type == "tri")
            await triArbitWsList[bot.platform].addBot(bot, undefined, bot.demo);
        else {
            await crossArbitWsList[bot.platA].addBot(bot);
            await crossArbitWsList[bot.platB].addBot(bot);
        }
    }
};