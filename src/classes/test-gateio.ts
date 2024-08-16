import { getInterval, parseDate } from "@/utils/funcs2";
import { ensureDirExists } from "@/utils/orders/funcs";
import { Platform } from "./test-platforms";
import { ApiClient, SpotApi } from "gate-api";
import { writeFileSync } from "fs";

export class TestGateio extends Platform {
    name = "GATEIO";
    maker: number = 0.1 / 100;
    taker: number = 0.1 / 100;
    client: SpotApi;
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    constructor({ demo = false }: { demo?: boolean }) {
        super({ demo });
        this.flag = demo ? "1" : "0";
        this.apiKey = demo
            ? process.env.OKX_API_KEY_DEV!
            : process.env.OKX_API_KEY!;
        this.apiSecret = demo
            ? process.env.OKX_API_SECRET_DEV!
            : process.env.OKX_API_SECRET!;
        this.passphrase = process.env.OKX_PASSPHRASE!;

        const client = new ApiClient();
        this.client = new SpotApi(client);
    }

    _parseData(data: (number | string)[][]){
           /**
                 *  0 - Unix timestamp with second precision
                    1 - Trading volume in quote currency
                    2 - Closing price
                    3 - Highest price
                    4 - Lowest price
                    5 - Opening price
                    6 - Trading volume in base currency
                    7 - Whether the window is closed; tr
                 */
        return data.map((el) => {
            return el.map((el, i) =>
                i == 0 ? Number(el) * 1000 : el
            );
        }).map(el=> [el[0], el[5], el[3], el[4], el[2], el[1], el[7]]);
    }

    async getKlines({
        start,
        end,
        savePath,
        interval,
        symbol,
        isBybit,
    }: {
        end?: number | undefined;
        start?: number | undefined;
        interval: number;
        symbol: string;
        savePath?: string | undefined;
        isBybit?: boolean;
    }) {

            
            console.log({ client: "client", demo: this.demo }, "\n");
            end = end ?? Date.now() - interval * 60000;
            
            const END = end
            const diff = (10000 - 30) * interval * 60000
            const MIN_DATE =end - diff;

            console.log({
                MIN_DATE: parseDate(new Date(MIN_DATE)),
                START: parseDate(new Date(start ?? 0)),
            });
            if (start && start < MIN_DATE) {
                //start = MIN_DATE;
                //end = start + diff
            }
            if (end && end > Date.now()) {
                end = Date.now();
            }
            console.log({
                MIN_DATE: parseDate(new Date(MIN_DATE)),
                START: parseDate(new Date(start ?? 0)),
            });

            let klines: any[] = [];
            let cnt = 0;
            console.log(
                `[ ${
                    isBybit ? "ByBit" : this.name
                } ] \t GETTING KLINES.. FOR ` + symbol
            );

            if (start) {
                start =
                    (isBybit ? start : start) /* - interval * 60 * 1000 */ -
                    20 * interval * 60000; /* ACCORDING TO RETURNED DATA */
            }

            if (start) {
                let firstTs = start;
                while (firstTs <= end) {
                    console.log(`GETTING ${cnt + 1} KLINES...`);
                    const limit = 1000;
                    const after = firstTs + (limit - 1) * interval * 60 * 1000;
                    console.log(
                        `Before: ${parseDate(
                            new Date(firstTs)
                        )} \t After: ${parseDate(new Date(after))}`
                    );
                    console.log("GETTING MARK PRICE");
                    const res = await this.client.listCandlesticks(
                        symbol,

                        {
                            interval: getInterval(interval, "gateio"),
                            from: Math.round(firstTs / 1000),
                            to: Math.round(after / 1000),
                            limit: limit,
                        }
                    );
                    const data = this._parseData(res.body) 
                    if (!data?.length) break;

                    if (klines.length)
                    console.log({ last: parseDate(new Date(klines[klines.length - 1][0])), new: parseDate(new Date(data[0][0])) });
                    klines.push(...[...data]);

                    firstTs = Number(data[data.length -1][0]) + interval * 60 * 1000;

                    console.log(new Date(firstTs).toISOString());
                    if (savePath) {
                        ensureDirExists(savePath);
                        writeFileSync(savePath, JSON.stringify(klines));
                        console.log("Saved");
                    }
                    cnt += 1;
                }
            } else {
                const res = await this.client.listCandlesticks(
                    symbol,

                    {
                        interval: getInterval(interval, "gateio"),
                        from: start ? Math.round(start / 1000) : undefined,
                        to: end ? Math.round(end / 1000) : undefined,
                    }
                );

             
                    
                const data = this._parseData(res.body) 
                klines = [...data];
            }

            let d = [...klines]
            console.log(d[d.length - 1]);
            return d;
        
    }
}
