import axios from "axios";
import { handleErrs, timedLog } from "./functions";
import { okxInstrus } from "./data/instrus";
import { writeJson } from "./bend/functions";
import { instrusRootDir } from "./constants";

export async function fetchAllInstrus () {

    try{timedLog('Fetching okx instrus...')
    const okxRes = await axios.get("https://www.okx.com/api/v5/public/instruments?instType=SPOT");
    writeJson(`${instrusRootDir}/okx-instrus.json`,okxRes.data.data);

    timedLog('Fetching binance instrus...')
    const binanceRes = await axios.get("https://api.binance.com/api/v3/exchangeInfo");
    writeJson(`${instrusRootDir}/binance-instrus.json`,binanceRes.data.symbols);

    timedLog('Fetching bitget instrus...')
    const bitgetRes = await axios.get("https://api.bitget.com/api/v2/spot/public/symbols");
    writeJson(`${instrusRootDir}/bitget-instrus.json`,bitgetRes.data.data);

    timedLog('Fetching bybit instrus...')
    const bybitRes = await axios.get("https://api.bybit.com/v5/market/instruments-info?category=spot&limit=1000");
    writeJson(`${instrusRootDir}/bybit-instrus.json`,bybitRes.data.result.list);

    timedLog('Fetching kucoin instrus...')
    const kucoinRes = await axios.get("https://api.kucoin.com/api/v2/symbols");
    writeJson(`${instrusRootDir}/kucoin-instrus.json`,kucoinRes.data.data);

    timedLog('Fetching mexc instrus...')
    const mexcRes = await axios.get("https://api.mexc.com/api/v3/exchangeInfo");
    writeJson(`${instrusRootDir}/mexc-instrus.json`,mexcRes.data.symbols);

    timedLog("All done baby!!!")}
    catch(err)
    {
        handleErrs(err)
    }

}