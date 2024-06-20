import { Strategy } from "@/classes/strategy";
import { IObj } from "@/utils/interfaces";

class CE_ONLY extends Strategy {
    name: string = "RSI ONLY";
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;

    buyCond(row: IObj): boolean {
        const smaCond = row.sma_20 > row.sma_50 && row.macd > 0;
        return (row.rsi <= 45 && smaCond) || smaCond;
    }

    sellCond(row: IObj): boolean {
        const smaCond = row.sma_20 < row.sma_50 && row.macd < 0;
        const cond = (row.rsi >= 55 && smaCond) || smaCond;
        return cond; //&& row.macd < 0
    }
}
class BB_SMA extends Strategy {
    name: string = "BB_SMA";
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;

    buyCond(row: IObj): boolean {
        const smaCond = row.sma_20 >= row.sma_50 && row.macd >= 0;
        return row.c > row.o || smaCond;
    }

    sellCond(row: IObj): boolean {
        const smaCond = row.sma_20 <= row.sma_50 && row.macd <= 0;
        return row.c < row.o || smaCond;
    }
}
class ThreeSum extends Strategy {
    name: string = "ThreeSum";
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;

    buyCond(row: IObj, df?: IObj[], i?: number): boolean {
        const smaCond = row.buy_signal == 1 && row.sma_20 > row.sma_50
                let bool = true;
        return smaCond && bool;
    }

    sellCond(row: IObj, entry?: number, df?: IObj[], i?: number): boolean {
        const smaCond = row.sell_signal == 1 && row.sma_20 < row.sma_50
               let bool = true;
        return smaCond && bool;
    }
}

export const strategies = [new CE_ONLY(), new BB_SMA(), new ThreeSum()];
