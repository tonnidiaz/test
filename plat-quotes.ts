import { getInstrus } from "@/utils/funcs3";
import { TPlatName } from "@/utils/interfaces";
const quotes = [
    {
        plat: "bitget",
        quotes: ["USDT", "EUR", "USDC", "ETH", "BTC", "BRL"],
    },
    {
        plat: "kucoin",
        quotes: [
            "USDT",
            "BTC",
            "ETH",
            "KCS",
            "TRX",
            "DAI",
            "USDC",
            "DOGE",
            "BRL",
            "EUR",
            "TRY",
        ],
    },
    {
        plat: "okx",
        quotes: [
            "AUD",
            "AED",
            "HKD",
            "BRL",
            "EUR",
            "TRY",
            "USDT",
            "USDC",
            "BTC",
            "ETH",
            "OKB",
            "DAI",
        ],
    },
    {
        plat: 'binance',
        quotes: [
          'BTC',  'ETH',  'USDT', 'BNB',   'TUSD',
          'PAX',  'USDC', 'XRP',  'USDS',  'TRX',
          'BUSD', 'NGN',  'RUB',  'TRY',   'EUR',
          'ZAR',  'BKRW', 'IDRT', 'GBP',   'UAH',
          'BIDR', 'AUD',  'DAI',  'BRL',   'BVND',
          'VAI',  'USDP', 'DOGE', 'UST',   'DOT',
          'PLN',  'RON',  'ARS',  'FDUSD', 'AEUR',
          'JPY',  'MXN',  'CZK',  'COP'
        ]
      }
];
const getAll = (plat: TPlatName) => {
    const instrus = getInstrus(plat);
    const quotes = Array.from(new Set(instrus.map((el) => el[1])));
    console.log({ plat, quotes });
};
const getCoinsWithQuote = (plat: TPlatName, quote: string) => {
    const instrus = getInstrus(plat);
    const coins = instrus.filter((el) => el[1] == quote);
    console.log({ plat, quote, len: coins.length, coins });
};
//getAll('kucoin')
//getCoinsWithQuote('kucoin', 'BRL')
// getAll("okx");
// getCoinsWithQuote('okx', 'BRL')
// getAll("mexc");
getCoinsWithQuote('bitget', 'BRL')

/* 
BITGET = [EUR]
KUCOIN = [KCS]
OKX = [OKB,EUR, ETH, HKD]
BINANCE = [PAX, JPY]
*/
