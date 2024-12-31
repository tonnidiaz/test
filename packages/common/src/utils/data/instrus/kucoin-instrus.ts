import { readJson } from "@cmn/utils/bend/functions"
import { instrusRootDir } from "@cmn/utils/constants"

const instru =  {
        symbol: "AVA-USDT",
        name: "AVA-USDT",
        baseCurrency: "AVA",
        quoteCurrency: "USDT",
        feeCurrency: "USDT",
        market: "USDS",
        baseMinSize: "0.1",
        quoteMinSize: "0.1",
        baseMaxSize: "10000000000",
        quoteMaxSize: "99999999",
        baseIncrement: "0.01",
        quoteIncrement: "0.0001",
        priceIncrement: "0.0001",
        priceLimitRate: "0.1",
        minFunds: "0.1",
        isMarginEnabled: false,
        enableTrading: true,
    }
    
    type Instru = typeof instru

    export const kucoinInstrus: Instru[] =  readJson(instrusRootDir + "/kucoin-instrus.json")
    