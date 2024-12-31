import { readJson } from "@cmn/utils/bend/functions"
import { instrusRootDir } from "@cmn/utils/constants"

const instru = {
            symbol: "TRXUSDT",
            baseCoin: "TRX",
            quoteCoin: "USDT",
            minTradeAmount: "0",
            maxTradeAmount: "10000000000",
            takerFeeRate: "0.002",
            makerFeeRate: "0.002",
            pricePrecision: "5",
            quantityPrecision: "4",
            quotePrecision: "6",
            status: "online",
            minTradeUSDT: "5",
            buyLimitPriceRatio: "0.05",
            sellLimitPriceRatio: "0.05",
            areaSymbol: "no",
        }
        
        type Instru = typeof instru

export const bitgetInstrus: Instru[] =  readJson(instrusRootDir + "/bitget-instrus.json")

