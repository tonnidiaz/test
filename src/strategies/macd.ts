import { Strategy } from "@/classes/strategy"
import { IObj } from "@/utils/interfaces"


class MACDONLY extends Strategy{
    name: string = "MACD ONLY"
    desc: string = `Enters: macd > 0  \n  Exit:  macd < 0`

    buyCond(row: IObj): boolean {
        return row.macd > 0
    }

    sellCond(row: IObj): boolean {
        return row.macd < 0

    }
}


class MACD_CE3 extends Strategy{
    name: string = "MACD CE3"
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`

    buyCond(row: IObj): boolean {
        return  row.macd > 0 && row.sma_20 > row.sma_50
    }

    sellCond(row: IObj): boolean {
        const cond = (row.macd < 0) && (row.sma_20 < row.sma_50)
        return cond 
    }
} 
class MACD_SMA extends Strategy{
    name: string = "MACD SMA"
    desc: string = `Enter: sma20 >  sma50, Exit: oposite `

    buyCond(row: IObj): boolean {
        return  row.sma_20 > row.sma_50//cond && smaDiff > diff
    }

    sellCond(row: IObj): boolean {
        return  row.sma_20 < row.sma_50

    }
} 
class SMA_EXT extends Strategy{
    name: string = "SMA EXT"
    desc: string = `Enter: sma20 >  sma50 && low is < 5% from o, Exit: oposite `

    buyCond(row: IObj): boolean {
        return   row.sma_20 >= row.sma_50 && (row.o - row.l)/row.l*100 <=5//cond && smaDiff > diff
    }

    sellCond(row: IObj): boolean {
        return   row.sma_20 <= row.sma_50 && (row.h - row.o ) / row.o * 100 <=5

    }
} 


class CE_ONLY extends Strategy{
    name: string = "CE_ONLY"
    desc: string = "JUST A CE"
    buyCond(row: IObj): boolean {
        return row.buy_signal == 1
    }

    sellCond(row: IObj): boolean {
        return row.sell_signal == 1 
    }
}
class CE extends Strategy{
    name: string = "CE"
    desc: string = "JUST A CE"
    buyCond(row: IObj): boolean {
        return row.buy_signal == 1 || MACD_SMA.prototype.buyCond(row)
    }

    sellCond(row: IObj): boolean {
        return row.sell_signal == 1 || MACD_SMA.prototype.sellCond(row)
    }
}

export const strategies = [
    new MACDONLY(),
    new MACD_CE3(),
    new MACD_SMA(), new SMA_EXT(), new CE_ONLY(), new CE()
]