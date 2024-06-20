import { data } from "@/data/data";
import { ensureDirExists } from "@/utils/orders/funcs";
import { parseDate } from "@/utils/funcs2";
import axios from "axios";
import { unlinkSync, writeFileSync } from "fs";
import { Platform } from "./test-platforms";

export class TestBinance extends Platform {
    async getKlines({
        symbol,
        start,
        end,
        interval = 15,
        savePath} : {
            symbol?: string,
            start?: number,
            end?: number,
            interval: number,
            savePath?: string}
    ) {

            if (savePath){
                console.log('DELETING PREVIOUS DATA...');
                try{
                    unlinkSync(savePath)
                }catch(e){
                    console.log('ERROR REMOVING FILE');
                }
            }
            let cnt = 0;
            let klines: [][] = [];
            symbol = (symbol ?? data.symbol).replaceAll("-", "")
            interval = interval ?? data.interval;
            ///if (start) start -= 10 * interval * 60 * 1000;
            end = end ?? Date.now();
            const parsedInterval =
                interval < 60
                    ? `${interval}m`
                    : `${Math.round(interval / 60)}h`;

            if (start) {
                let firstTs = start;
                while (firstTs <= end) {
                    console.log(`[Binance] GETTING ${cnt + 1} KLINES...`);
                    console.log(parseDate(new Date(firstTs)));
                    const res = await axios.get(
                        `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${parsedInterval}&startTime=${firstTs}`
                    );
                    const data = res.data;
                    klines.push(...data);

                    if (data.length == 0) break;

                    firstTs = data[data.length - 1][6];
                    if (savePath) {
                        writeFileSync(savePath, JSON.stringify(klines));
                        console.log("Sved");
                    }
                    cnt += 1;
                }
            } else {
                const res = await axios.get(
                    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${parsedInterval}&endTime=${end}`
                );
                klines = res.data;
            }
            if (savePath){
                ensureDirExists(savePath)
                writeFileSync(savePath, JSON.stringify(klines))
                console.log("Final Klines Saved");
            }
            console.log(klines.length)
            console.log("DONE FETCHING KLINES");;
            return klines
    }
}
