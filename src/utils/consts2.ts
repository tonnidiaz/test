
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
        WRX: {start: "2024-06-14 00:00:00+02:00", end: "2024-06-15 00:00:00+02:00"}
    };