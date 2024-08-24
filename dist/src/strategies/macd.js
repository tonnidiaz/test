"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategies = exports.STOCHIE = exports.HL_HA = exports.HL = exports.RITA = exports.MA_RSI = exports.CE_MACD = exports.CE_MA = exports.CE_ONLY = exports.MA_EXT = exports.MACD_HL_HA = exports.MACD_MA_RSI = exports.MACD_MA = exports.MA_ONLY = exports.MACD_EXT = exports.MACD_ONLY = void 0;
const strategy_1 = require("@/classes/strategy");
const ce_sma_1 = require("./ce-sma");
class MACD_ONLY extends strategy_1.Strategy {
    name = "MACD ONLY";
    desc = `Enters: macd > 0  \n  Exit:  macd < 0`;
    buyCond(row) {
        return row.hist > 0; //row.macd > row.signal
    }
    sellCond(row) {
        return row.hist < 0; //row.macd < row.signal 
    }
}
exports.MACD_ONLY = MACD_ONLY;
class MACD_EXT extends strategy_1.Strategy {
    name = "MACD EXT";
    desc = `Enters: macd > 0  \n  Exit:  macd < 0`;
    buyCond(row) {
        return row.hist > 0 && row.c > row.o;
    }
    sellCond(row) {
        return row.hist < 0 && row.c < row.o;
    }
}
exports.MACD_EXT = MACD_EXT;
class MA_ONLY extends strategy_1.Strategy {
    name = "MA_ONLY";
    desc = `Enter: sma20 >  sma50, Exit: oposite `;
    buyCond(row) {
        return row.sma_20 > row.sma_50; //cond && smaDiff > diff
    }
    sellCond(row) {
        return row.sma_20 < row.sma_50;
    }
}
exports.MA_ONLY = MA_ONLY;
class MACD_MA extends strategy_1.Strategy {
    name = "MACD_MA";
    desc = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;
    buyCond(row) {
        return MACD_ONLY.prototype.buyCond(row) && MA_ONLY.prototype.buyCond(row);
    }
    sellCond(row) {
        return MACD_ONLY.prototype.sellCond(row) && MA_ONLY.prototype.sellCond(row);
    }
}
exports.MACD_MA = MACD_MA;
class MACD_MA_RSI extends strategy_1.Strategy {
    name = "MACD_MA_RSI";
    desc = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;
    buyCond(row) {
        return true; //MACD_ONLY.prototype.buyCond(row) || MA_ONLY.prototype.buyCond(row)
    }
    sellCond(row) {
        return MACD_ONLY.prototype.sellCond(row) && MA_ONLY.prototype.sellCond(row) && ce_sma_1.RSI_ONLY.prototype.sellCond(row);
    }
}
exports.MACD_MA_RSI = MACD_MA_RSI;
class MACD_HL_HA extends strategy_1.Strategy {
    name = "MACD_HL_HA";
    desc = `Enter: macd > 0 && sma20 >  sma50, Exit: oposite`;
    buyCond(row) {
        return MACD_EXT.prototype.buyCond(row) && HL_HA.prototype.buyCond(row);
    }
    sellCond(row) {
        return MACD_EXT.prototype.sellCond(row) && HL_HA.prototype.sellCond(row);
    }
}
exports.MACD_HL_HA = MACD_HL_HA;
class MA_EXT extends strategy_1.Strategy {
    name = "MA_EXT";
    desc = `Enter: sma20 >  sma50 && low is < 5% from o, Exit: oposite `;
    buyCond(row) {
        return (row.sma_20 > row.sma_50 && row.c > row.o
        //((row.ha_o - row.ha_l) / row.ha_l) * 100 <= 5
        ); //cond && smaDiff > diff
    }
    sellCond(row) {
        return (row.sma_20 < row.sma_50 && row.c < row.o
        //((row.ha_h - row.ha_o) / row.ha_o) * 100 <= 5
        );
    }
}
exports.MA_EXT = MA_EXT;
class CE_ONLY extends strategy_1.Strategy {
    name = "CE_ONLY";
    desc = "JUST A CE";
    buyCond(row) {
        return row.buy_signal == 1;
    }
    sellCond(row) {
        return row.sell_signal == 1;
    }
}
exports.CE_ONLY = CE_ONLY;
class CE_MA extends strategy_1.Strategy {
    name = "CE_MA";
    desc = "JUST A CE";
    buyCond(row) {
        return CE_ONLY.prototype.buyCond(row) && MA_ONLY.prototype.buyCond(row);
    }
    sellCond(row) {
        return (CE_ONLY.prototype.sellCond(row) && MA_ONLY.prototype.sellCond(row));
    }
}
exports.CE_MA = CE_MA;
class CE_MACD extends strategy_1.Strategy {
    name = "CE_MACD";
    desc = "JUST A CE";
    buyCond(row) {
        return CE_ONLY.prototype.buyCond(row) || MACD_EXT.prototype.buyCond(row);
    }
    sellCond(row) {
        return (CE_ONLY.prototype.sellCond(row) || MACD_EXT.prototype.sellCond(row));
    }
}
exports.CE_MACD = CE_MACD;
class MA_RSI extends strategy_1.Strategy {
    name = "MA_RSI";
    desc = "JUST A CE";
    buyCond(row) {
        return MA_ONLY.prototype.buyCond(row) || ce_sma_1.RSI_ONLY.prototype.buyCond(row);
    }
    sellCond(row) {
        return (MA_ONLY.prototype.sellCond(row) || ce_sma_1.RSI_ONLY.prototype.sellCond(row));
    }
}
exports.MA_RSI = MA_RSI;
class RITA extends strategy_1.Strategy {
    name = "RITA";
    desc = "JUST A CE";
    buyCond(row) {
        return (CE_ONLY.prototype.buyCond(row) || ce_sma_1.RSI_ONLY.prototype.buyCond(row) || MA_ONLY.prototype.buyCond(row)); // || RSI_ONLY.prototype.buyCond(row))
    }
    sellCond(row) {
        return ((CE_ONLY.prototype.sellCond(row) || ce_sma_1.RSI_ONLY.prototype.sellCond(row) || MA_ONLY.prototype.sellCond(row)) // || RSI_ONLY.prototype.sellCond(row)
        );
    }
}
exports.RITA = RITA;
class HL extends strategy_1.Strategy {
    name = "HL";
    desc = "JUST A CE";
    buyCond(row) {
        return row.c > row.o;
    }
    sellCond(row) {
        return row.c < row.o;
    }
}
exports.HL = HL;
class HL_HA extends strategy_1.Strategy {
    name = "HL_HA";
    desc = "JUST A CE";
    buyCond(row) {
        return row.ha_c > row.ha_o; // || RSI_ONLY.prototype.buyCond(row)
    }
    sellCond(row) {
        return row.ha_c < row.ha_o; // || RSI_ONLY.prototype.sellCond(row)
    }
}
exports.HL_HA = HL_HA;
class STOCHIE extends strategy_1.Strategy {
    name = "STOCHIE";
    desc = "JUST A CE";
    buyCond(row) {
        return row.stoch_k > row.stoch_d; // || RSI_ONLY.prototype.buyCond(row)
    }
    sellCond(row) {
        return row.stoch_k < row.stoch_d; // || RSI_ONLY.prototype.sellCond(row)
    }
}
exports.STOCHIE = STOCHIE;
exports.strategies = [
    new MACD_ONLY(),
    new MACD_EXT(),
    new MA_ONLY(),
    new MA_EXT(),
    new MACD_MA(),
    new HL(), new HL_HA(),
];
