import { Strategy } from "@/classes/strategy";
import { IObj } from "@/utils/interfaces";
import { RSI_ONLY } from "./ce-sma";

class MACD_ONLY extends Strategy {
    name: string = "MACD ONLY";
    desc: string = `Enters: macd > 0  \n  Exit:  macd < 0`;

    buyCond(row: IObj): boolean {
        return row.macd > 0;
    }

    sellCond(row: IObj): boolean {
        return row.macd < 0;
    }
}
class MACD_EXT extends Strategy {
    name: string = "MACD EXT";
    desc: string = `Enters: macd > 0  \n  Exit:  macd < 0`;

    buyCond(row: IObj): boolean {
        return row.macd > 0 && row.c > row.o;
    }

    sellCond(row: IObj): boolean {
        return row.macd < 0 && row.c < row.o
    }
}

class MACD_MA extends Strategy {
    name: string = "MACD_MA";
    desc: string = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;

    buyCond(row: IObj): boolean {
        return row.macd > 0 && row.sma_20 > row.sma_50;
    }

    sellCond(row: IObj): boolean {
        const cond = row.macd < 0 && row.sma_20 < row.sma_50;
        return cond;
    }
}
class MA_ONLY extends Strategy {
    name: string = "MA_ONLY";
    desc: string = `Enter: sma20 >  sma50, Exit: oposite `;

    buyCond(row: IObj): boolean {
        return row.sma_20 > row.sma_50; //cond && smaDiff > diff
    }

    sellCond(row: IObj): boolean {
        return row.sma_20 < row.sma_50;
    }
}
class SMA_EXT extends Strategy {
    name: string = "SMA EXT";
    desc: string = `Enter: sma20 >  sma50 && low is < 5% from o, Exit: oposite `;

    buyCond(row: IObj): boolean {
        return (
            row.sma_20 > row.sma_50 && row.c > row.o
            //((row.ha_o - row.ha_l) / row.ha_l) * 100 <= 5
        ); //cond && smaDiff > diff
    }

    sellCond(row: IObj): boolean {
        return (
            row.sma_20 < row.sma_50 && row.c < row.o
            //((row.ha_h - row.ha_o) / row.ha_o) * 100 <= 5
        );
    }
}

class CE_ONLY extends Strategy {
    name: string = "CE_ONLY";
    desc: string = "JUST A CE";
    buyCond(row: IObj): boolean {
        return row.buy_signal == 1;
    }

    sellCond(row: IObj): boolean {
        return row.sell_signal == 1;
    }
}

class CE_MA extends Strategy {
    name: string = "CE_MA";
    desc: string = "JUST A CE";
    buyCond(row: IObj): boolean {
        return CE_ONLY.prototype.buyCond(row) && MA_ONLY.prototype.buyCond(row);
    }

    sellCond(row: IObj): boolean {
        return (
            CE_ONLY.prototype.sellCond(row) && MA_ONLY.prototype.sellCond(row)
        );
    }
}
class CE_MACD extends Strategy {
    name: string = "CE_MACD";
    desc: string = "JUST A CE";
    buyCond(row: IObj): boolean {
        return CE_ONLY.prototype.buyCond(row) || MACD_ONLY.prototype.buyCond(row);
    }

    sellCond(row: IObj): boolean {
        return (
            CE_ONLY.prototype.sellCond(row) || MACD_ONLY.prototype.sellCond(row)
        );
    }
}
class RITA extends Strategy {
    name: string = "RITA";
    desc: string = "JUST A CE";
    buyCond(row: IObj): boolean {
        return  (CE_ONLY.prototype.buyCond(row) && RSI_ONLY.prototype.buyCond(row) && MA_ONLY.prototype.buyCond(row))// || RSI_ONLY.prototype.buyCond(row))
    }

    sellCond(row: IObj): boolean {
        return(
            (CE_ONLY.prototype.sellCond(row) && RSI_ONLY.prototype.sellCond(row) && MA_ONLY.prototype.sellCond(row))// || RSI_ONLY.prototype.sellCond(row)
        );
    }
}

class HL extends Strategy {
    name: string = "HL";
    desc: string = "JUST A CE";
    buyCond(row: IObj): boolean {
        return row.c > row.o;
    }

    sellCond(row: IObj): boolean {
        return row.c < row.o;
    }
}
class HL_HA extends Strategy {
    name: string = "HL_HA";
    desc: string = "JUST A CE";
    buyCond(row: IObj): boolean {
        return row.ha_c > row.ha_o;
    }

    sellCond(row: IObj): boolean {
        return row.ha_c < row.ha_o;
    }
}

export const strategies = [
    new MACD_ONLY(),
    new MACD_EXT(),
    new MACD_MA(),
    new MA_ONLY(),
    new SMA_EXT(),
    new CE_ONLY(),
    new CE_MA(),
    new CE_MACD(),
    new RITA(),
    new HL(), new HL_HA()
];
