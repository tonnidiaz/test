import { coinApiDates } from "@/utils/consts2";
import {
    clearTerminal,
    existsSync,
    readJson,
    writeJson,
    encodeDate,
} from "@/utils/functions";
import axios from "axios";

const symbol_id = "BYBITSPOT_SPOT_SOL_USDT";
const klinesURL = `https://rest.coinapi.io/v1/ohlcv/${symbol_id}/history`;
const order_book_URL = `https://rest.coinapi.io/v1/orderbooks/${symbol_id}/history`;
const headers = {
    "X-CoinAPI-Key": "5CFA6702-2C91-4F98-A45B-FAB3564E0A90", //"2851C217-28DF-4101-9B79-37A206346424"//"DC1A54FA-ECCC-40A8-A2FE-E094386A30F9"//"CDE0DA21-63A5-4AFA-B3BE-B93D6447EAFF"
};

clearTerminal();
const params = {
    //"period_id": "15MIN",
    limit: 100000,
    time_end: "2024-06-20T00:00:00",
    time_start: "2024-06-18T00:00:00",
};

const get_klines = () => {
    const res = axios.get(klinesURL, { params, headers });
    /* with open('data/coin-api/bybit-spot/klines.json', 'w') as f:
        
        json.dump(res.json(), f) */
    console.log("DONE");
};
const order_book_file = `data/coin-api/bybit-spot/orderbook/${symbol_id}_${
    params["time_start"].split("T")[0]
}_${params["time_end"].split("T")[0]}.json`;

const readOrderBook = () => {
    console.log("READING...");
    const data = readJson(order_book_file);
    return data;
};

const readKlines = () => {
    const pth = "data/coin-api/bybit-spot/SOL-USDT_2024-06-18_2024-06-19.json";
    const klines = true
        ? readJson("data/coin-api/bybit-spot/SOL-USDT.json")
        : readJson(pth).map((e) => ({
              ts: e.time_period_start,
              o: e.price_open,
              h: e.price_high,
              l: e.price_low,
              c: e.price_close,
              v: e.volume_traded,
          }));
    return klines;
};

const COIN_API_BASE_URL = "https://rest.coinapi.io/v1";

const KEY0 = "5CFA6702-2C91-4F98-A45B-FAB3564E0A90",
    KEY1 = "2851C217-28DF-4101-9B79-37A206346424",
    KEY2 = "DC1A54FA-ECCC-40A8-A2FE-E094386A30F9",
    KEY3 = "CDE0DA21-63A5-4AFA-B3BE-B93D6447EAFF", KEY4 = "2954911D-0DDC-4539-A914-11DBB2FD41D5";

const getOrderbook = async ({
    start,
    symbolId,
    end,
    limit,
    plat,
    save = true,
    log = false,
    skipSaved = true,
    pre,
}: {
    start: string;
    symbolId: string;
    plat: string;
    end: string;
    save?: boolean;
    log?: boolean;
    skipSaved?: boolean;
    limit?: number;
    pre?: string;
}) => {
    pre = pre ? pre + "_" : "";
    const folder = "_data/coin-api/" + plat;
    const fname = `${symbolId}_${encodeDate(start)}-${encodeDate(end)}.json`;
    const savePath = `${folder}/${pre}${fname}`;
    // max_limit = 100000
    const params = {
        limit,
        limit_levels: 2,
        time_start: new Date(start).toISOString(),
        time_end: new Date(end).toISOString(),
    };

    const headers = {
        "X-CoinAPI-Key": KEY1,
    };

    try {
        console.log("GETTING ORDERBOOK...");
        if (skipSaved && existsSync(savePath))
            return console.log("BOOK ALREADY EXISTS!!!");
        const url = `${COIN_API_BASE_URL}/orderbooks/${symbolId}/history`;
        console.log(url);
        const res = await axios.get(url, { headers, params });
        const ob = res.data;
        const len = ob?.length;
        console.log({ len });
        if (!len) console.log(res.data);

        if (save) {
            writeJson(savePath, ob);
        }
        if (log){console.log(ob)}

        console.log("DONE");
    } catch (e) {
        console.log(e);
    }
};



const symb = "SAGA"
const plat = 'binance'
// getOrderbook({
//     symbolId: plat.toUpperCase() + "_SPOT_USDC_USDT",
//     plat,
//     limit: 100000,
//     start: coinApiDates[symb].start,
//     end: coinApiDates[symb].end,
//     skipSaved: true,
//     save: true,
// });
getOrderbook({
    symbolId: plat.toUpperCase() + "_SPOT_SOL_USDT",
    plat,
    limit: 1,
    start: "2024-08-01 00:05:00+02:00",
    end: "2024-08-01 00:05:01+02:00",
    skipSaved: true,
    save: false,
    log: true
});
