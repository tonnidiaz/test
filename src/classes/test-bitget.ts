import { getInterval, parseDate } from "@/utils/funcs2";
import { ensureDirExists } from "@/utils/orders/funcs";
import { Platform } from "./test-platforms";
import { RestClientV2 } from "bitget-api";
import { writeFileSync } from "fs";
import { CompanyResultSortBy } from "indicatorts";

export class TestBitget extends Platform {
    name = "BITGET";
    maker: number = 0.1 / 100; 
    taker: number = 0.1 / 100;
    client: RestClientV2;
    flag: "1" | "0";
    apiKey: string;
    apiSecret: string;
    passphrase: string;

    constructor({ demo = false }: { demo?: boolean }) {
        super({ demo });
        this.flag = demo ? "1" : "0";
        this.apiKey = demo
            ? process.env.BITGET_API_KEY_DEV!
            : process.env.BITGET_API_KEY!;
        this.apiSecret = demo
            ? process.env.BITGET_API_SECRET_DEV!
            : process.env.BITGET_API_SECRET!;
        this.passphrase = process.env.BITGET_PASSPHRASE!;

        this.client = new RestClientV2({});
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

        const END = end;
        const diff = (10000 - 30) * interval * 60000;
        const MIN_DATE = end - diff;

        console.log({
            MIN_DATE: parseDate(new Date(MIN_DATE)),
            START: parseDate(new Date(start ?? 0)),
        });
        if (start && start < MIN_DATE) {
            //start = MIN_DATE;
            //end = start + diff
        }
        if (end && end > Date.now()) {
            //end = Date.now();
        }
        console.log({
            MIN_DATE: parseDate(new Date(MIN_DATE)),
            START: parseDate(new Date(start ?? 0)),
        });

        let klines: any[] = [];
        let done = false;
        let cnt = 0;
        console.log(
            `[ ${isBybit ? "ByBit" : this.name} ] \t GETTING KLINES.. FOR ` +
                symbol
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
                const limit = 200;
                const after = firstTs + (limit - 1) * interval * 60 * 1000;
                console.log(
                    `\nBefore: ${parseDate(
                        new Date(firstTs)
                    )} \t After: ${parseDate(new Date(after))}`
                );
                console.log("GETTING MARK PRICE");
                const res = await this.client.getSpotHistoricCandles({
                    symbol,
                    granularity: getInterval(interval, "bitget"),
                    endTime: Math.round(after),
                    limit: limit,
                });
                let { data } = res;
                data = data.map((el) => el.map((el) => Number(el)));

                const last = klines.length != 0 && Number(klines[klines.length - 1][0])
                const _new = Number(data[0][0])
                console.log(
                    "\n",
                    {
                        last: last && parseDate(
                            new Date(klines[klines.length - 1][0])
                        ),
                        new: parseDate(new Date(data[0][0])),
                    },
                    "\n"
                );
                
                if (last){
                    if (last >= _new)
                    {console.log("LAST > NEW")}
                    data = data.filter(el => el[0] > last)
                    
                }
                if (!data?.length) break; 

               

                klines.push(...[...data]);

                firstTs =
                    Number(data[data.length - 1][0]) + 2 * interval * 60 * 1000;

                console.log(new Date(firstTs).toISOString());
                if (savePath) {
                    ensureDirExists(savePath);
                    writeFileSync(savePath, JSON.stringify(klines));
                    console.log("Saved");
                }

                if (done){break}
                cnt += 1;
            }
        } else {
            const res = await this.client.getSpotHistoricCandles({
                symbol,
                granularity: getInterval(interval, "bitget"),
                endTime: end,
            });

            const { data } = res;
            klines = [...data];
        }

        let d = [...klines];
        console.log(d[d.length - 1]);
        return d;
    }
}
