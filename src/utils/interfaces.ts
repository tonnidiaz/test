import { ObjectId } from "mongoose";

export interface IObj {[key: string]: any}
export interface ICandle {ts: string,
    o: number, h: number, l: number, c: number,
    ha_o: number, ha_h: number, ha_l: number, ha_c: number,
    [key: string]: number | any
}
export interface IAddress  {

    place_name: string,
    center: [number],
    street: string,
    suburb: string,
    city: string,
    line2: string,
    state: string,
    postcode: number,
    phone: string,
    name: string,
}

export interface ITrade {
    ts: string, symbol: string, px: number, sz: number
}

export interface IOrderDetails {
    id: string;
    fillTime: number;
    cTime: number;
    fillSz: number;
    fillPx: number;
    fee: number;
}

export interface IOpenBot {
    id: ObjectId;
    exitLimit: number;
    klines: any[][];
}

export interface IPlat {
    name: string;
    base: number;
    quote: number;
    med: number,
    df: ICandle[],
    medDf: ICandle[],
}

export interface ICcy {
    ccy: string;
    chain: string;
    maxFee: number;
    minFee: number;
    minDep: number;
    minWd: number;
    maxWd: number;
}