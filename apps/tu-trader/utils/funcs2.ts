import { okxInstrus } from "../src/data/okx-instrus";
import { bybitInstrus } from "~/src/data/bybit-instrus";
import { binanceInfo } from "~/src/data/binance-info";
import { gateioInstrus } from "../src/data/gateio-instrus";
import { bitgetInstrus } from "../src/data/bitget-instrus";
import { mexcInstrus } from "../src/data/mexc-instrus";
import { kucoinInstrus } from "../src/data/kucoin-instrus";

export const getInstrus = (_platName: string) => {
    let _instruments: string[][] = [];

    switch (_platName) {
        case "bybit":
            _instruments = bybitInstrus
                .filter((el) => el.status == "Trading")
                .map((el) => [el.baseCoin, el.quoteCoin]);
            break;
        case "binance":
            _instruments = binanceInfo.symbols
                .filter((el) => el.isSpotTradingAllowed == true)
                .map((el) => [el.baseAsset, el.quoteAsset]);
            break;
        case "gateio":
            _instruments = gateioInstrus
                .filter((el) => el.trade_status == "tradable")
                .map((el) => [el.base, el.quote]);
            break;
        case "bitget":
            _instruments = bitgetInstrus
                .filter((el) => el.status == "online")
                .map((el) => [el.baseCoin, el.quoteCoin]);
            break;
        case "mexc":
            console.log(`\nMEXC BABAYYYYYYY\n`)
            _instruments = mexcInstrus
                .filter((el) => el.status == "1" && el.isSpotTradingAllowed && el.orderTypes.map(el=> el.toLowerCase()).includes('market'))
                .map((el) => [el.baseAsset, el.quoteAsset]);
            break;
        case "okx":
            _instruments = okxInstrus
                .filter((el) => el.state == "live")
                .map((el) => [el.baseCcy, el.quoteCcy]);
            break;
        case "kucoin":
            _instruments = kucoinInstrus
                .filter((el) => el.enableTrading)
                .map((el) => [el.baseCurrency, el.quoteCurrency]);
            break;
    }
    return _instruments;
};

export function ceil(num: number, dec: number) {
    const isLarge = `${num}`.includes("e");
    return isLarge || dec == 0 ? num : Number(num.toFixed(dec));
}
export const getSymbol = (pair: string[], plat: string) => {
    plat = plat.toLowerCase();
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

export const calcPerc = (num1: number, num2: number) => {
    return ceil(((num2 - num1) / num1) * 100, 2);
};


export const timedLog = (...args) =>
    console.log(`[${parseDate(new Date())}]`, ...args);