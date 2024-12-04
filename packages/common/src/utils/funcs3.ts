import { IBot, ITriArbitOrder } from "@cmn/models/bot";
import { klinesRootDir } from "./constants";
import { bitgetInstrus } from "./data/instrus/bitget-instrus";
import { bybitInstrus } from "./data/instrus/bybit-instrus";
import { gateioInstrus } from "./data/instrus/gateio-instrus";
import { mexcInstrus } from "./data/instrus/mexc-instrus";
import { okxInstrus } from "./data/instrus/okx-instrus";
import { parseDate, getSymbol } from "./functions";
import { botLog } from "./bend/functions";
import { kucoinInstrus } from "./data/instrus/kucoin-instrus";
import { TriArbitOrder, TuOrder } from "@cmn/models";
import { max } from "indicatorts";
import axios from "axios";
export const getKlinesPath = ({
    plat,
    demo = false,
    interval,
    pair,
    year,
    prefix = ""
}: {
    plat: TPlatName;
    pair: string[];
    interval: number;
    demo?: boolean;
    year: number;
    prefix?: string
}) => {
    const t = demo ? "demo" : "live";
    const klinesPath = `${klinesRootDir}/${plat}/${year}/${t}/${prefix}${getSymbol(
        pair,
        plat
    )}_${interval}m-${t}.json`;
    console.log({klinesPath});
    return klinesPath
};

export {getInstrus} from "./functions"

export const getMakerFee = (plat: string) => {
    plat = plat.toLowerCase();
    let fee = 0.1 / 100;
    return fee;
};
export const getTakerFee = (plat: string) => {
    plat = plat.toLowerCase();
    let fee = 0.1 / 100;
    return fee;
};

export const deactivateBot = async (bot: IBot) => {
    botLog(bot, "\nDEACTIVATING...");
    bot.active = false;
    bot.deactivated_at = parseDate(Date.now());
    await bot.save();

    botLog(bot, "BOT DEACTIVATED\n");
};
export const reactivateBot = async (bot: IBot, deep = false) => {
    botLog(bot, "\nREACTIVATING...");
    bot.active = true;
    bot.deactivated_at = undefined;
    if (deep) bot.activated_at = parseDate(Date.now());
    await bot.save();

    botLog(bot, "BOT REACTIVATED\n");
};

export const parseArbitOrder = async (order: ITriArbitOrder) => {
    order = await order.populate("order.a");
    order = await order.populate("order.b");
    order = await order.populate("order.c");
    return order;
};
export const parseOrders = async (_bot: IBot, _start: number, max: number) => {
    const orders: any[] = [];

    const end = _start + max;
    //console.log("\n", _bot.name, _bot.parent)
    if (_bot.type == "arbitrage") {
        const ords = await TriArbitOrder.find({ bot: _bot.id }).exec();
        for (let ord of ords.slice(_start, end)) {
            ord = await parseArbitOrder(ord);
            orders.push(ord.order);
        }
    } else {
        const ords = await TuOrder.find({
            bot: _bot.id,
            is_arbit: _bot.parent != undefined,
        }).exec();
        for (let ord of ords.slice(_start, end)) {
            orders.push(ord);
        }
    }
};

const KUCOIN_TOKEN_URL = "https://api.kucoin.com/api/v1/bullet-public";
let kucoinTokenTs = Date.now();
let kucoinToken = "";

const getKucoinToken = async () => {
    const diff = Date.now() - kucoinTokenTs;
    if (diff < 60 * 60000 && kucoinToken.length) return kucoinToken;
    try {
        const r = await axios.post(KUCOIN_TOKEN_URL);
        kucoinToken = r.data?.data?.token ?? "";
        return kucoinToken;
    } catch (e) {
        console.log("FAILED TO GET KUCOIN TOKEN");
        console.log(e);
    }
};
export const KUCOIN_WS_URL = async () =>
    "wss://ws-api-spot.kucoin.com/?token=" + (await getKucoinToken());

export const safeJsonParse = <T>(str: any) => {
    try {
        const jsonValue: T = JSON.parse(str);

        return jsonValue;
    } catch {
        return str; 
    }
};

import crypto from "crypto";
import { IObj, TPlatName } from "./interfaces";
import { binanceInstrus } from "./data/instrus/binance-instrus";
export const getLastItem = (arr: any[]) => [...arr].pop();

const rmEmptyParams = (p: IObj)=>{
    const p2 = {}
    for (let k of Object.keys(p)){
        if (!p[k] || p[k] == ""){continue}
        p2[k] = p[k]
    }

    return p2
}
export const genSignature = (
    apiKey: string,
    apiSecret: string,
    params: IObj,
    plat: TPlatName, ts?: number
) => {
    const timestamp = ts ??  Date.now().toString();
    params = rmEmptyParams({...params});
    const paramString = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");
console.log(paramString)
/* 
crypto
            .createHmac('sha256', this.config.apiSecret)
            .update(queryString)
            .digest('hex');
*/
    
    const prehashString =plat == 'mexc' || plat == "binance" ? paramString : `${timestamp}${apiKey}${paramString}`;
    console.log({prehashString, apiSecret})
    const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(prehashString)
        .digest("hex");

    return signature//.toLocaleLowerCase();
};
