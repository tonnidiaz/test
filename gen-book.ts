import { parseDate } from "@/utils/funcs2";
import { sleep, writeJson } from "@/utils/functions";
import { IOrderbook } from "@/utils/interfaces";

const book = {
    ts: "2024-09-18 12:23:44+02:00",
    asks: [
        { px: 128.48, amt: 162.606 },
        { px: 128.49, amt: 235.608 },
        { px: 128.5, amt: 238.604 },
        { px: 128.51, amt: 301.98 },
        { px: 128.52, amt: 487.958 },
    ],
    bids: [
        { px: 128.47, amt: 578.407 },
        { px: 128.46, amt: 277.728 },
        { px: 128.45, amt: 458.317 },
        { px: 128.44, amt: 395.408 },
        { px: 128.43, amt: 331.607 },
    ],
};

const startTs = Date.parse("2024-09-01 00:00:00+02:00");
const endTs = Date.parse("2024-09-28 23:59:59+02:00");

const interval = 5; //mins
let ts = startTs;

async function genBook() {
    const savePath = "_data/ob/SOL-USDT-1M.json";

    const ob: IOrderbook[] = [];

    while (ts <= endTs) {
        await sleep(0.000000001);
        ob.push({
            ts: parseDate(ts),
            asks: book.asks as any,
            bids: book.bids as any,
        });
        ts += interval * 60000;
        writeJson(savePath, ob)
    }
    console.log("DONE");
}
genBook()