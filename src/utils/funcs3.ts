import { binanceInfo } from "./binance-info";
import { klinesRootDir } from "./constants";
import { bitgetInstrus } from "./data/instrus/bitget-instrus";
import { bybitInstrus } from "./data/instrus/bybit-instrus";
import { gateioInstrus } from "./data/instrus/gateio-instrus";
import { mexcInstrus } from "./data/instrus/mexc-instrus";
import { okxInstrus } from "./data/instrus/okx-instrus";
import { getSymbol } from "./functions";

export const getKlinesPath = ({
    plat,
    demo = false,
    interval,
    pair,
    year,
}: {
    plat: string;
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



export const getInstrus = (_platName: string)=>{
    let _instruments: string[][] = [];

            switch (_platName) {
                case "bybit":
                    _instruments = bybitInstrus.filter(el=> el.status == 'Trading').map((el) => [
                        el.baseCoin,
                        el.quoteCoin,
                    ]);
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
                    _instruments = mexcInstrus
                        .filter((el) => el.status == '1' && el.isSpotTradingAllowed)
                        .map((el) => [el.baseAsset, el.quoteAsset]);
                    break;
                case "okx":
                    _instruments = okxInstrus
                        .filter((el) => el.state == 'live')
                        .map((el) => [el.baseCcy, el.quoteCcy]);
                    break;
            }
            return _instruments
}

export const getMakerFee = (plat: string) =>{
    plat = plat.toLowerCase()
    let fee = .1/100
    return fee
}
export const getTakerFee = (plat: string) =>{
    plat = plat.toLowerCase()
    let fee = .1/100
    return fee
}