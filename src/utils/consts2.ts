
import { OKX } from "@/classes/okx";
import { Bybit } from "@/classes/bybit";
import { Mexc } from "@/classes/mexc";
import { Binance } from "@/classes/binance";
import { Kucoin } from "@/classes/kucoin";
export const objPlats = 
    {okx: OKX, bybit: Bybit, binance: Binance, kucoin: Kucoin }

    interface IDate {
        start: string;
        end: string;
    }
    
    export const coinApiDates: { [key: string]: IDate } = {
        BDX: {
            start: "2024-03-13 13:00:00+02:00",
            end: "2024-03-14 00:00:00+02:00",
        },
        WRX: {start: "2024-06-14 00:00:00+02:00", end: "2024-06-15 00:00:00+02:00"},
        UNO: {start: "2024-06-14 00:00:00+02:00", end: "2024-06-15 00:00:00+02:00"},
        LAYER: {start: "2024-06-14 00:00:00+02:00", end: "2024-06-15 00:00:00+02:00"},
        CAS: {start: "2024-06-14 00:00:00+02:00", end: "2024-06-15 00:00:00+02:00"},
        HAI: {start: "2024-06-14 00:00:00+02:00", end: "2024-06-15 00:00:00+02:00"},
    };

    export const OKX_WS_URL = "wss://ws.okx.com:8443/ws/v5/public";
    export const OKX_WS_URL_DEMO = "wss://wspap.okx.com:8443/ws/v5/public";
    export const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/spot";
    export const BYBIT_WS_URL_DEMO = "wss://stream-testnet.bybit.com/v5/public/spot";
    export const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws";
    export const BITGET_WS_URL = "wss://ws.bitget.com/v2/ws/public"
    export const KUCOIN_TOKEN_URL = "https://api.kucoin.com/api/v1/bullet-public";
    export const MEXC_WS_URL = "wss://wbs.mexc.com/ws"

    export const platList = ["binance", "bitget", "bybit", "kucoin", "okx", "mexc", "gateio"] as const;
    export const netsRootDir = "src/utils/data/currencies"