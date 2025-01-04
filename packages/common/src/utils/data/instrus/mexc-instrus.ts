
const instru = {
        symbol: "TRUMP1USDT",
        status: "1",
        baseAsset: "TRUMP1",
        baseAssetPrecision: 0,
        quoteAsset: "USDT", 
        quotePrecision: 15,
        quoteAssetPrecision: 15,
        baseCommissionPrecision: 0,
        quoteCommissionPrecision: 15,
        orderTypes: ["LIMIT", "MARKET", "LIMIT_MAKER"],
        isSpotTradingAllowed: true,
        isMarginTradingAllowed: false,
        quoteAmountPrecision: "1.000000000000000000000000000000",
        baseSizePrecision: "0",
        permissions: ["SPOT"],
        filters: [],
        maxQuoteAmount: "2000000.000000000000000000000000000000",
        makerCommission: "0",
        takerCommission: "0.0002",
        quoteAmountPrecisionMarket: "1.000000000000000000000000000000",
        maxQuoteAmountMarket: "100000.000000000000000000000000000000",
        fullName: "SIMPSONTRUMP",
        tradeSideType: 1,
    }
    

    type Instru = typeof instru
    import instrus from "./mexc-instrus.json"
    export const mexcInstrus: Instru[] =  instrus as any
    
    