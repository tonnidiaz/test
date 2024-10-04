import { bybitInstrus, binanceInstrus, gateioInstrus, bitgetInstrus, mexcInstrus, okxInstrus, kucoinInstrus } from "./data/instrus";
import { TPlatName } from "./interfaces";

export const getInstrus = (_platName: TPlatName) => {
    let _instruments: string[][] = [];

    switch (_platName) {
        case "bybit":
            _instruments = bybitInstrus
                .filter((el) => el.status == "Trading")
                .map((el) => [el.baseCoin, el.quoteCoin]);
            break;
        case "binance":
            _instruments = binanceInstrus
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
            console.log(`\nMEXC BABAYYYYYYY\n`);
            _instruments = mexcInstrus
                .filter(
                    (el) =>
                        el.status == "1" &&
                        el.isSpotTradingAllowed &&
                        el.orderTypes
                            .map((el) => el.toLowerCase())
                            .includes("market")
                )
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
