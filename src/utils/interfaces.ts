import { ObjectId } from "mongoose";

export interface IObj {[key: string]: any}
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