import { platList } from "./consts3";

export interface IObj {
    [key: string]: any;
}
export interface IRetData {
    ep: string;
    clId: string;
    data: IObj; 
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
    cnt?: number;
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

export type TPlatName = (typeof platList)[number];

export interface ICoinNets {
    name: string;
    coin: string;
    ticker?: number;

    nets: {
        coin: string;
        name: string;
        contractAddr: string;
        chain: string;
        wdTip?: string | null;
        dpTip?: string | null;
        minWd: number;
        wdFee: number;
        wdFeeUSDT: number;
        maxWd: number;
        minDp: number;
        maxDp: number;
        minComfirm: number;
        canDep: boolean;
        canWd: boolean;
    }[];
}


export interface ITask {id: string; interval: number; cb: (id: string)=> any}

export interface IError {msg: string, code: number}
export interface IGetData {err?: IError, data?: any}
export interface ISelectItem {label: string, value: any, disabled?: boolean; class?: string; html?: string}
export type TGetData = (...args: any)=> Promise<IGetData>
