import { kucoinInstrus } from "@/utils/data/instrus/kucoin-instrus";
import { getInterval, parseDate, parseKlines } from "@/utils/funcs2";
import { clearTerminal } from "@/utils/functions";
import { Kline, SpotClient } from "kucoin-api";

function _parseData(data: Kline[]) {
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

clearTerminal()
const getKlines = async () => {
    const start = Date.parse("2024-01-01 00:00:00+02:00");
    const end = Date.parse("2024-09-01 23:00:00+02:00");
    const limit = 1500;
    const interval = 60;

    console.log({ start, end });
    const client = new SpotClient();
    let firstTs = start;
    let cnt = 0
    
    const klines: number[][] = []
    while (firstTs <= end) {
        cnt ++
        let after = firstTs + limit * interval * 60000;
        const res = await client.getKlines({
            symbol: "SUSHI-USDT",
            type: getInterval(interval, "kucoin"),
            endAt: Math.round(after / 1000),
            startAt: Math.round(firstTs / 1000),
        });
        if (res.code != "200000") {
            return console.log(res);
        }
        const data = _parseData(res.data);
        klines.push(...[...data].reverse())
        firstTs = data[0][0] + interval * 60000
        console.log({
            len: res.data.length,
            first: parseDate(data[0][0]),
            last: parseDate(data[data.length - 1][0]),
        }, '\n');
    }
    const df = parseKlines(klines)
    for (let row of df){
        console.log(row.ts)
    }
};

//getKlines();
const getQuoted = (quote='ETH') =>{
    const koins = kucoinInstrus.filter(el => el.enableTrading && el.quoteCurrency == quote).map(el=> el.baseCurrency)
    console.log(koins.length)
}

getQuoted()