import { Platform } from "./test-platforms";
import { SpotClient } from "kucoin-api";
import type { Kline } from "kucoin-api";
import { MAKER_FEE_RATE, TAKER_FEE_RATE } from "@/utils/constants";
import { ensureDirExists } from "@/utils/orders/funcs";
import { getInterval, parseDate } from "@/utils/funcs2";
import { botLog, readJson } from "@/utils/functions";
import axios, { AxiosResponse } from "axios";
import { existsSync, writeFileSync } from "fs";

export class TestKucoin extends Platform {
    name = "Kucoin";
    maker: number = 0.1 / 100;
    taker: number = 0.1 / 100;
    client: SpotClient;
    constructor({ demo = false }: { demo?: boolean }) {
        super({ demo });
        this.client = new SpotClient();
    }
    _parseData(data: Kline[]) {
        /**
              *  0 - ts in secs
                 1 - Open
                 2 - Close
                 3 - Highest price
                 4 - Lowest price
                 5 - Trading volume in base currency
              */
        return data.map((el) => {
            return [el[0], el[1], el[3], el[4], el[2], el[5]].map((el2, i) =>
                i == 0 ? Number(el2) * 1000 : Number(el2)
            );
        });
    }

    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
    }: {
        end?: number | undefined;
        start: number;
        interval: number;
        symbol: string;
        savePath?: string | undefined;
    }) {
        await super.getKlines({ start, end, savePath, symbol, interval });
        try {
            end = end ?? Date.now();
            let cnt = 0;

            const klines: number[][] = [];
            let firstTs = start;
            const limit = 1500;
            while (firstTs <= end) {
                cnt++;
                let after = firstTs + limit * interval * 60000;
                const res = await this.client.getKlines({
                    symbol,
                    type: getInterval(interval, "kucoin"),
                    endAt: Math.round(after / 1000),
                    startAt: Math.round(firstTs / 1000),
                });
                if (res.code != "200000") {
                    return console.log(res);
                }
                const data = this._parseData(res.data);
                if (!data.length) break
                klines.push(...[...data].reverse());
                firstTs = data[0][0] + interval * 60000;
                if (savePath) {
                    ensureDirExists(savePath);
                    writeFileSync(savePath, JSON.stringify(klines));
                    console.log("Klines saved!!");
                }
                console.log(
                    {
                        len: res.data.length,
                        first: parseDate(data[0][0]),
                        last: parseDate(data[data.length - 1][0]),
                    },
                    "\n"
                );
            }

            //let d = [...klines];
            //console.log(d[d.length - 1]);
            return klines;
        } catch (e) {
            console.log(e);
        }
    }
}
