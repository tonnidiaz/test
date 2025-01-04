
const instru = {
        symbol: "BTCUSDT",
        baseCoin: "BTC",
        quoteCoin: "USDT",
        innovation: "0",
        status: "Trading",
        marginTrading: "both",
        lotSizeFilter: {
            basePrecision: "0.000001",
            quotePrecision: "0.00000001",
            minOrderQty: "0.000048",
            maxOrderQty: "71.73956243",
            minOrderAmt: "1",
            maxOrderAmt: "4000000",
        },
        priceFilter: {
            tickSize: "0.01",
        },
        riskParameters: {
            limitParameter: "0.03",
            marketParameter: "0.03",
        },
    }
    
    type Instru = typeof instru

    import instrus from "./bybit-instrus.json"
    export const bybitInstrus: Instru[] =  instrus as any
    
    