
import { mexcInstrus } from "./data/instrus/mexc-instrus";
import { binanceInstrus } from "./data/instrus/binance-instrus";
import { kucoinInstrus } from "./data/instrus/kucoin-instrus";
import { bitgetInstrus } from "./data/instrus/bitget-instrus";
import { bybitInstrus } from "./data/instrus/bybit-instrus";
import { gateioInstrus } from "./data/instrus/gateio-instrus";
import { okxInstrus } from "./data/instrus/okx-instrus";
import { IObj, TPlatName } from "./interfaces";

const test = false;

export function randomInRange(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}


export const isEmail = (emailAdress: string) => {
    let regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailAdress.match(regex) ? true : false;
};

const ddNum = (e: any) => {
    e = `${e}`.trim();
    return e.length == 1 ? `0${e}` : e;
};
const toISOString = (date: string) => {
    let dateArr = date.split(",");
    let time = dateArr[1];
    time = time
        .split(":")
        .map((el) => ddNum(el))
        .join(":");
    dateArr = dateArr[0].split("/");
    date = `${dateArr[0]}-${ddNum(dateArr[1])}-${ddNum(dateArr[2])}`;
    return `${date} ${time}+02:00`;
};
export const parseDate = (date?: Date | string | number) =>
    toISOString(
        new Date(date || Date.now()).toLocaleString("en-ZA", {
            timeZone: "Africa/Johannesburg",
        })
    );



export const timedLog = (...args: any[]) =>
    console.log(`\n[${parseDate(new Date())}]`, ...args);
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
export function clog(message?: any, ...params: any[]) {
    console.log(message, ...params);
}
export function toFixed(num: number, dec: number) {
    const re = new RegExp("^-?\\d+(?:.\\d{0," + (dec || -1) + "})?");
    const isLarge = `${num}`.includes("e");
    return isLarge || dec == 0 ? num : Number(num.toString().match(re)![0]);
}
export function ceil(num: number, dec: number) {
    const isLarge = `${num}`.includes("e");
    return isLarge || dec == 0 ? num : Number(num.toFixed(dec));
}

/**
 * 
 * @param num1 must be less than num2
 * @returns the percentage difference between the two numbers
 */
export const calcPerc = (num1: number, num2: number) => ceil((num2 - num1)/ num1 * 100, 2)

export function precision(a: number) {
    if (!isFinite(a)) return 0;
    var e = 1,
        p = 0;
    while (Math.round(a * e) / e !== a) {
        e *= 10;
        p++;
    }
    return p; //p == 1 ? p : p - 1;
}

export function getCoinPrecision(
    pair: string[],
    oType: "limit" | "market",
    plat: string
) {
    const _base = pair[0],
        _quote = pair[1];
    let instru = getInstru(pair, plat);

    if (!instru) {
        console.log(`\getCoinPrecision: ${pair} not on ${plat}\n`);
        return null;
    }

    let pr: number | null = 0;
    const is_quote = oType == "market";
    switch (plat) {
        case "binance":
            const _i0 = instru as (typeof binanceInstrus)[0];
            pr = Number(
                oType == "market"
                    ? _i0.quoteAssetPrecision
                    : _i0.baseAssetPrecision
            );
            break;
        case "bitget":
            const _i1 = instru as (typeof bitgetInstrus)[0];
            pr = Number(is_quote ? _i1.quotePrecision : _i1.quantityPrecision);
            break;
        case "bybit":
            const _i2 = instru as (typeof bybitInstrus)[0];

            pr = precision(
                Number(
                    is_quote
                        ? _i2.lotSizeFilter.quotePrecision
                        : _i2.lotSizeFilter.basePrecision
                )
            );
            break;
        case "okx":
            const _i3 = instru as (typeof okxInstrus)[0];
            pr = precision(Number(is_quote ? _i3.tickSz : _i3.lotSz));
            break;

        case "gateio":
            const _i4 = instru as (typeof gateioInstrus)[0];
            pr = Number(is_quote ? _i4.precision : _i4.amount_precision);
            break;
        case "mexc":
            const _i5 = instru as (typeof mexcInstrus)[0];
            pr = Number(
                is_quote ? _i5.quoteAssetPrecision : _i5.baseAssetPrecision
            );
            break;
        case "kucoin":
            const _i6 = instru as (typeof kucoinInstrus)[0];
            pr = precision(
                Number(is_quote ? _i6.quoteIncrement : _i6.baseIncrement)
            );
            break;
    }
    return pr;
}

const getInstru = (pair: string[], plat: string) => {
    const _base = pair[0],
        _quote = pair[1];
    let instru: IObj | undefined;

    switch (plat) {
        case "binance":
            instru = binanceInstrus.find(
                (el) => el.baseAsset == pair[0] && el.quoteAsset == pair[1]
            );
            break;
        case "bybit":
            instru = bybitInstrus.find(
                (el) =>
                    el.baseCoin == _base &&
                    el.quoteCoin == _quote &&
                    el.status == "Trading"
            );
            break;
        case "bitget":
            instru = bitgetInstrus.find(
                (el) => el.baseCoin == _base && el.quoteCoin == _quote
            );
            break;
        case "okx":
            instru = okxInstrus.find(
                (el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]
            );
            break;
        case "gateio":
            instru = gateioInstrus.find(
                (el) => el.base == _base && el.quote == _quote
            );
            break;
        case "mexc":
            instru = mexcInstrus.find(
                (el) =>
                    el.baseAsset == _base &&
                    el.quoteAsset == _quote &&
                    el.status == "1" &&
                    el.isSpotTradingAllowed
            );
            break;

        case "kucoin":
            instru = kucoinInstrus.find(
                (el) =>
                    el.baseCurrency == _base &&
                    el.quoteCurrency == _quote &&
                    el.enableTrading
            );
            break;
    }

    return instru;
};

export function getPricePrecision(pair: string[], plat: string) {
    let instru = getInstru(pair, plat);
    console.log({pair, plat})
    if (!instru) {
        console.log(`\ngetPricePrecision: ${pair} not on ${plat}\n`);
        return null;
    }

    let pr: number | null = null;
    switch (plat) {
        case "binance":
            const _i0 = instru as (typeof binanceInstrus)[0];
            pr = Number(_i0.quoteAssetPrecision);
            break;
        case "bitget":
            const _i1 = instru as (typeof bitgetInstrus)[0];
            pr = Number(_i1.pricePrecision);
            break;
        case "bybit":
            const _i2 = instru as (typeof bybitInstrus)[0];
            pr = precision(Number(_i2.priceFilter.tickSize));
            break;
        case "okx":
            const _i3 = instru as (typeof okxInstrus)[0];
            pr = precision(Number(_i3.tickSz));
            break;

        case "gateio":
            const _i4 = instru as (typeof gateioInstrus)[0];
            pr = Number(_i4.precision);
            break;
        case "mexc":
            const _i5 = instru as (typeof mexcInstrus)[0];
            pr = Number(_i5.quotePrecision);
            break;
        case "kucoin":
            const _i6 = instru as (typeof kucoinInstrus)[0];
            pr = precision(Number(_i6.priceIncrement));
            break;
    }
    return pr;
}

export function getMinSz(pair: string[], plat: string) {
    try {
        if (test) return -Infinity;
        const _base = pair[0],
            _quote = pair[1];
        let instru = getInstru(pair, plat);

        if (!instru) {
            console.log(`\ngetMinSz: ${pair} not on ${plat}\n`);
            return null;
        }

        let sz: number | null = null;
        switch (plat) {
            case "binance":
                const _i0 = instru as (typeof binanceInstrus)[0];
                sz = Number(
                    _i0.filters.find(
                        (el) => el.filterType == "MARKET_LOT_SIZE"
                    )!.minQty
                );
                break;
            case "bitget":
                const _i1 = instru as (typeof bitgetInstrus)[0];
                sz = Number(_i1.minTradeAmount);
                break;
            case "bybit":
                const _i2 = instru as (typeof bybitInstrus)[0];
                sz = Number(_i2.lotSizeFilter.minOrderQty);
                break;
            case "okx":
                const _i3 = instru as (typeof okxInstrus)[0];
                sz = Number(_i3.minSz);
                break;

            case "gateio":
                const _i4 = instru as (typeof gateioInstrus)[0];
                sz = Number(_i4.min_base_amount);
                break;
            case "mexc":
                const _i5 = instru as (typeof mexcInstrus)[0];
                sz = -Infinity; //Number(_i5.min_base_amount)
                break;
            case "kucoin":
                const _i6 = instru as (typeof kucoinInstrus)[0];
                sz = Number(_i6.baseMinSize);
                break;
        }
        return sz;
    } catch (e) {
        console.log(e);
        return null;
    }
}
export function getMaxSz(pair: string[], plat: string) {
    if (test) return Infinity;
    const _base = pair[0],
        _quote = pair[1];
    let instru = getInstru(pair, plat);

    if (!instru) {
        console.log(`\ngetMaxSz: ${pair} not on ${plat}\n`);
        return null;
    }

    let sz: number | null = null;
    switch (plat) {
        case "binance":
            const _i0 = instru as (typeof binanceInstrus)[0];
            sz = Number(_i0.filters[3].maxQty);
            break;
        case "bitget":
            const _i1 = instru as (typeof bitgetInstrus)[0];
            sz = Number(_i1.maxTradeAmount);
            break;
        case "bybit":
            const _i2 = instru as (typeof bybitInstrus)[0];
            sz = Number(_i2.lotSizeFilter.maxOrderQty);
            break;
        case "okx":
            const _i3 = instru as (typeof okxInstrus)[0];
            sz = Number(_i3.maxLmtSz);
            break;

        case "gateio":
            const _i4 = instru as (typeof gateioInstrus)[0];
            sz = Number(_i4.max_base_amount);
            break;
        case "mexc":
            const _i5 = instru as (typeof mexcInstrus)[0];
            sz = Infinity; //Number(_i5.max_base_amount)
            break;
        case "kucoin":
            const _i6 = instru as (typeof kucoinInstrus)[0];
            sz = Number(_i6.baseMaxSize);
            break;
    }
    return sz;
}
export function getMaxAmt(pair: string[], plat: string) {
    if (test) return Infinity;
    const _base = pair[0],
        _quote = pair[1];
    let instru = getInstru(pair, plat);

    if (!instru) {
        console.log(`\ngetMinSz: ${pair} not on ${plat}\n`);
        return null;
    }

    let sz: number | null = null;
    switch (plat) {
        case "binance":
            const _i0 = instru as (typeof binanceInstrus)[0];
            sz = Infinity;
            break;
        case "bitget":
            const _i1 = instru as (typeof bitgetInstrus)[0];
            sz = Number(_i1.maxTradeAmount);
            break;
        case "bybit":
            const _i2 = instru as (typeof bybitInstrus)[0];
            sz = Number(_i2.lotSizeFilter.maxOrderAmt);
            break;
        case "okx":
            const _i3 = instru as (typeof okxInstrus)[0];
            sz = Number(_i3.maxMktAmt);
            break;

        case "gateio":
            const _i4 = instru as (typeof gateioInstrus)[0];
            sz = Number(_i4.max_quote_amount);
            break;
        case "mexc":
            const _i5 = instru as (typeof mexcInstrus)[0];
            sz = Number(_i5.maxQuoteAmount);
            break;
        case "kucoin":
            const _i6 = instru as (typeof kucoinInstrus)[0];
            sz = Number(_i6.quoteMaxSize);
            break;
    }
    return sz;
}
export function getMinAmt(pair: string[], plat: string) {
    const _base = pair[0],
        _quote = pair[1];
    let instru = getInstru(pair, plat);

    if (!instru) {
        console.log(`\ngetMinSz: ${pair} not on ${plat}\n`);
        return null;
    }

    let sz: number | null = null;
    sz = 1; // 1 USDT MIN
    switch (plat) {
        case "binance":
            const _i0 = instru as (typeof binanceInstrus)[0];
            sz = Number(
                _i0.filters.find((el) => el.filterType == "NOTIONAL")!
                    .minNotional
            );
            break;
        case "bitget":
            const _i1 = instru as (typeof bitgetInstrus)[0];
            sz = Number(_i1.minTradeAmount);
            break;
        case "bybit":
            const _i2 = instru as (typeof bybitInstrus)[0];
            sz = Number(_i2.lotSizeFilter.minOrderAmt);
            break;
        case "okx":
            const _i3 = instru as (typeof okxInstrus)[0];
            sz = _quote == "USDT" ? 1 : 0; //Number(_i3.min);
            break;
        case "kucoin":
            const _i4 = instru as (typeof kucoinInstrus)[0];
            sz = Number(_i4.quoteMinSize);
            break;
    }
    return sz;
}

export const sleep = async (ms: number) => {
    await new Promise((res) => setTimeout(res, ms));
};

export const isSameDate = (d1: Date, d2: Date) => {
    const _d1 = d1.toISOString().split("T");
    const _d1Date = _d1[0],
        _d1Time = _d1[1].slice(0, 5);

    const _d2 = d2.toISOString().split("T");
    const _d2Date = _d2[0],
        _d2Time = _d2[1].slice(0, 5);
    return _d1Date == _d2Date && _d1Time == _d2Time;
};

export const isBetween = (l: number, num: number, h: number) => {
    let ret = false;
    if (h == 0 || l == 0) {
        ret = h == 0 ? l < num : num < h;
    } else {
        ret = l < num && num < h;
    }
    return ret;
};

export function randomNum(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export const findAve = (numbers: number[]) => {
    const sum = numbers.reduce((a, c) => a + c, 0);
    const avg = sum / numbers.length;
    return avg;
};

export const getSymbol = (pair: string[], plat: TPlatName) => {
    let sep = "";
    switch (plat) {
        case "okx":
        case "kucoin":
            sep = "-";
            break;
        case "gateio":
            sep = "_";
            break;
    }

    return pair.join(sep);
};

export const clearTerminal = () => {
    process.stdout.write("\x1Bc");
};

export const encodeDate = (date: string) => {
    return date.replaceAll(":", "^").replace(" ", "T");
};

export const parseBinanceInfo = (info: IObj) =>{
    return info.symbols.map(el=>({...el, permissionSets: el.permissionSets.filter(el2 => el2 == "SPOT") }))
}