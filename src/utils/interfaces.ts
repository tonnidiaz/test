import { CrossArbitData } from "@/classes/tu";
import { ObjectId } from "mongoose";
import { Socket } from "socket.io";

export interface IObj {
    [key: string]: any;
}
export interface ICandle {
    ts: string;
    o: number;
    h: number;
    l: number;
    c: number;
    ha_o: number;
    ha_h: number;
    ha_l: number;
    ha_c: number;
    [key: string]: number | any;
}
export interface IAddress {
    place_name: string;
    center: [number];
    street: string;
    suburb: string;
    city: string;
    line2: string;
    state: string;
    postcode: number;
    phone: string;
    name: string;
}

export interface ITrade {
    ts: string;
    symbol: string;
    px: number;
    sz: number;
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
    df: ICandle[];
    med?: number;
    medDf?: ICandle[];
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

export interface IBook {
    px: number;
    amt: number;
    cnt: number;
}
export interface IOrderbook {
    ts: string;
    bids: IBook[];
    asks: IBook[];
}

export interface IOrderpage {
    ask: IBook;
    bid: IBook;
}

export interface IClientBot {
    A: string;
    B: string;
    C: string;
    platform: string;
    id: string;
}

export interface IABot {
    bot: IClientBot;
    active: boolean;
    pairA: string[];
    pairB: string[];
    pairC: string[];
    bookA?: IOrderpage;
    bookB?: IOrderpage;
    bookC?: IOrderpage;
    client: Socket;
}

export interface ICrossClientBot {
    platA: string;
    platB: string;
    id: string;
    pair: string[];

}
export interface ICrossArbitBot {
    bot: ICrossClientBot;
    active: boolean;
    pair: string[];
    data: CrossArbitData;
    client: Socket
}
