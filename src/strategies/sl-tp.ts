import { Strategy } from "@/classes/strategy"
import { ICandle } from "@/utils/interfaces"

class Str4 extends Strategy{
    name: string = "Strategy 4"
    desc: string = `Exists TP is 5% or < sl (swing low of last 50 candles)`

    buyCond(row: ICandle): boolean {
        return row['buy_signal'] == 1 && (row['sma_20']&& row['sma_50']&& row['sma_20'] > row['sma_50'])
    }

    sellCond(row: ICandle, entry: number, df: ICandle[], i: number): boolean {

        i += 1
        const last50Candles = df.slice(i - 50, i) 
        const lastSwingLow = Math.min(...last50Candles.map(e=>e.l))
        
        const sl =lastSwingLow
        console.log(this);
        const tp = entry * (1+ (5 / 100))

        console.log(`Stop loss: ${sl} \t TP: ${tp}`);
        return row['c'] >= tp || row.c <= sl//|| (row['sell_signal'] && row['sma_20'] < row['sma_50'])

    }
}

class Str5 extends Strategy{
    name: string = "Strategy 5"
    desc: string = `Exits on sell signal or < sl (swing low of last 50 candles)`

    buyCond(row: ICandle): boolean {
        return row['buy_signal'] == 1 && (row['sma_20']&& row['sma_50']&& row['sma_20'] > row['sma_50'])
    }

    sellCond(row: ICandle, entry: number, df: ICandle[], i: number): boolean {
        i += 1
        const last50Candles = df.slice(i - 50, i) 
        const lastSwingLow = Math.min(...last50Candles.map(e=>e.l))
        const sl =lastSwingLow
        return row['sell_signal'] == 1 || row.c <= sl

    }
}
class Str6 extends Strategy{
    name: string = "Strategy 6"
    desc: string = `Exits on sell signal && sma_20 < sma_50 or < sl (swing low of last 50 candles)`

    buyCond(row: ICandle): boolean {
        return row['buy_signal'] == 1 && (row['sma_20']&& row['sma_50']&& row['sma_20'] > row['sma_50'])
    }

    sellCond(row: ICandle, entry: number, df: ICandle[], i: number): boolean {
        i += 1
        const last50Candles = df.slice(i - 50, i) 
        const lastSwingLow = Math.min(...last50Candles.map(e=>e.l))
        const sl =lastSwingLow
        return (row['sell_signal'] == 1 && row['sma_20'] < row['sma_50']) || row.c <= sl

    }
}
class Str7 extends Strategy{
    name: string = "Strategy 7"
    desc: string = `sma_20 < sma_50 or < sl (swing low of last 50 candles)`

    buyCond(row: ICandle): boolean {
        return row['buy_signal'] == 1 && (row['sma_20']&& row['sma_50']&& row['sma_20'] > row['sma_50'])
    }

    sellCond(row: ICandle, entry: number, df: ICandle[], i: number): boolean {
        i += 1
        const last50Candles = df.slice(i - 50, i) 
        const lastSwingLow = Math.min(...last50Candles.map(e=>e.l))
        const sl =lastSwingLow
        return (row['sma_20'] < row['sma_50']) || row.c <= sl

    }
}

class Str8 extends Strategy{
    name: string = "Strategy 8"
    desc: string = `Exists TP is 5% or < sl (swing low of last 10 candles)`

    buyCond(row: ICandle): boolean {
        return row['buy_signal'] == 1 && (row['sma_20']&& row['sma_50']&& row['sma_20'] > row['sma_50'])
    }

    sellCond(row: ICandle, entry: number, df: ICandle[], i: number): boolean {

        i += 1
        const last50Candles = df.slice(i - 10, i) 
        const lastSwingLow = Math.min(...last50Candles.map(e=>e.l))
        
        const sl =lastSwingLow
        console.log(this);
        const tp = entry * (1+ (5 / 100))

        console.log(`Stop loss: ${sl} \t TP: ${tp}`);
        return row['c'] >= tp || row.c <= sl//|| (row['sell_signal'] && row['sma_20'] < row['sma_50'])

    }
}

class Str9 extends Strategy{
    name: string = "Strategy 9"
    desc: string = `Exits on sell signal or < sl (swing low of last 10 candles)`

    buyCond(row: ICandle): boolean {
        return row['buy_signal'] == 1 && (row['sma_20']&& row['sma_50']&& row['sma_20'] > row['sma_50'])
    }

    sellCond(row: ICandle, entry: number, df: ICandle[], i: number): boolean {
        i += 1
        const last50Candles = df.slice(i - 10, i) 
        const lastSwingLow = Math.min(...last50Candles.map(e=>e.l))
        const sl =lastSwingLow
        return row['sell_signal'] == 1 || row.c <= sl

    }
}
class Str10 extends Strategy{
    name: string = "Strategy 10"
    desc: string = `Exits on sell signal && sma_20 < sma_50 or < sl (swing low of last 10 candles)`

    buyCond(row: ICandle): boolean {
        return row['buy_signal'] == 1 && (row['sma_20']&& row['sma_50']&& row['sma_20'] > row['sma_50'])
    }

    sellCond(row: ICandle, entry: number, df: ICandle[], i: number): boolean {
        i += 1
        const last50Candles = df.slice(i - 10, i) 
        const lastSwingLow = Math.min(...last50Candles.map(e=>e.l))
        const sl =lastSwingLow
        return (row['sell_signal'] == 1 && row['sma_20'] < row['sma_50']) || row.c <= sl

    }
}
class Str11 extends Strategy{
    name: string = "Strategy 11"
    desc: string = `sma_20 < sma_50 or < sl (swing low of last 10 candles)`

    buyCond(row: ICandle): boolean {
        return row['buy_signal'] == 1 && (row['sma_20']&& row['sma_50']&& row['sma_20'] > row['sma_50'])
    }

    sellCond(row: ICandle, entry: number, df: ICandle[], i: number): boolean {
        i += 1
        const last50Candles = df.slice(i - 10, i) 
        const lastSwingLow = Math.min(...last50Candles.map(e=>e.l))
        const sl =lastSwingLow
        return (row['sma_20'] < row['sma_50']) || row.c <= sl

    }
}

export const strategies = []