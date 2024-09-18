import { Strategy } from "@/classes/strategy";
import { ICandle } from "@/utils/interfaces";
const fastRSI = 30
export class RSI_ONLY extends Strategy {
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;

    buyCond(row: ICandle): boolean {
        return (row.rsi < fastRSI)
    }

    sellCond(row: ICandle): boolean {
        return row.rsi > 100 - fastRSI
    }
}
export class ANY extends Strategy {
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;

    buyCond(row: ICandle): boolean {
        return true
    }

    sellCond(row: ICandle): boolean {
        return true
    }
}
class BB_SMA extends Strategy {
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;

    buyCond(row: ICandle): boolean {
        const smaCond = row.sma_20 >= row.sma_50 && row.macd >= 0;
        return row.c > row.o || smaCond;
    }

    sellCond(row: ICandle): boolean {
        const smaCond = row.sma_20 <= row.sma_50 && row.macd <= 0;
        return row.c < row.o || smaCond;
    }
}
class ThreeSum extends Strategy {
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;

    buyCond(row: ICandle, df?: ICandle[], i?: number): boolean {
        const smaCond = row.buy_signal == 1 && row.sma_20 > row.sma_50
                let bool = true;
        return smaCond && bool;
    }

    sellCond(row: ICandle, entry?: number, df?: ICandle[], i?: number): boolean {
        const smaCond = row.sell_signal == 1 && row.sma_20 < row.sma_50
               let bool = true;
        return smaCond && bool;
    }
}

export const strategies = [new ANY(), new ThreeSum(), new RSI_ONLY()]// [ new BB_SMA(), new ThreeSum()];
