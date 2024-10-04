import { IBot, ITriArbitOrder } from "../models/bot";
import { TriArbitOrder, Order } from "../models";
import axios from "axios";
import * as crypto from "crypto";
import { TPlatName, IObj } from "@common/utils/interfaces";
import { klinesRootDir } from "@common/utils/constants";
import { parseDate } from "@common/utils/funcs2";
import { getSymbol } from "@common/utils/functions";
import { botLog } from "./functions";

export const getKlinesPath = ({
    plat,
    demo = false,
    interval,
    pair,
    year,
}: {
    plat: TPlatName;
    pair: string[];
    interval: number;
    demo?: boolean;
    year: number;
}) => {
    const t = demo ? "demo" : "live";
    return `${klinesRootDir}/${plat}/${year}/${t}/${getSymbol(
        pair,
        plat
    )}_${interval}m-${t}.json`;
};


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
        const ords = await Order.find({
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


export const getLastItem = (arr: any[]) => [...arr].pop();
export const genSignature = (
    apiKey: string,
    apiSecret: string,
    params: IObj,
    plat: TPlatName
) => {
    const paramString = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");
console.log(paramString)
    const timestamp = Date.now().toString();
    const prehashString =plat == 'mexc' || plat == "binance" ? `${paramString}`: `${timestamp}${apiKey}${paramString}`;
    console.log({prehashString})
    const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(prehashString)
        .digest("hex");

    return signature.toLocaleLowerCase();
};
