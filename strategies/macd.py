

from classes.index import Strategy
from strategies.ce_sma import RSI_ONLY


class MACD_ONLY(Strategy):
    def __init__(self):
        super().__init__("MACD ONLY", "Enters: macd > 0\nExit: macd < 0")

    def buy_cond(self, row):
        return row['macd'] > row['signal'] and row['c'] < row['bb_lower']

    def sell_cond(self, row):
        return row['macd'] < row['signal'] and row['c'] > row['bb_upper']

class MACD_EXT(Strategy):
    def __init__(self):
        super().__init__("MACD EXT", "Enters: macd > 0\nExit: macd < 0")

    def buy_cond(self, row):
        return row['hist'] > 0 and row['c'] > row['o']

    def sell_cond(self, row):
        return row['hist'] < 0 and row['c'] < row['o']

class MA_ONLY(Strategy):
    def __init__(self):
        super().__init__("MA_ONLY", "Enter: sma20 > sma50, Exit: opposite")

    def buy_cond(self, row):
        return row['sma_20'] > row['sma_50']

    def sell_cond(self, row):
        return row['sma_20'] < row['sma_50']

class MACD_MA(Strategy):
    def __init__(self):
        super().__init__("MACD_MA", "Enter: macd > 0 && sma20 > sma50, Exit: opposite")

    def buy_cond(self, row):
        return MACD_EXT().buy_cond(row) or MA_ONLY().buy_cond(row)

    def sell_cond(self, row):
        return MACD_EXT().sell_cond(row) or MA_ONLY().sell_cond(row)

class SMA_EXT(Strategy):
    def __init__(self):
        super().__init__("SMA EXT", "Enter: sma20 > sma50 && low is < 5% from o, Exit: opposite")

    def buy_cond(self, row):
        return row['sma_20'] > row['sma_50'] and row['c'] > row['o']

    def sell_cond(self, row):
        return row['sma_20'] < row['sma_50'] and row['c'] < row['o']

class CE_ONLY(Strategy):
    def __init__(self):
        super().__init__("CE_ONLY", "JUST A CE")

    def buy_cond(self, row):
        return row['buy_signal'] == 1

    def sell_cond(self, row):
        return row['sell_signal'] == 1

class CE_MA(Strategy):
    def __init__(self):
        super().__init__("CE_MA", "JUST A CE")

    def buy_cond(self, row):
        return CE_ONLY().buy_cond(row) and MA_ONLY().buy_cond(row)

    def sell_cond(self, row):
        return CE_ONLY().sell_cond(row) and MA_ONLY().sell_cond(row)

class CE_MACD(Strategy):
    def __init__(self):
        super().__init__("CE_MACD", "JUST A CE")

    def buy_cond(self, row):
        return CE_ONLY().buy_cond(row) or MACD_EXT().buy_cond(row)

    def sell_cond(self, row):
        return CE_ONLY().sell_cond(row) or MACD_EXT().sell_cond(row)

class MA_RSI(Strategy):
    def __init__(self):
        super().__init__("MA_RSI", "JUST A CE")

    def buy_cond(self, row):
        return MA_ONLY().buy_cond(row) or RSI_ONLY().buy_cond(row)

    def sell_cond(self, row):
        return MA_ONLY().sell_cond(row) or RSI_ONLY().sell_cond(row)

class RITA(Strategy):
    def __init__(self):
        super().__init__("RITA", "JUST A CE")

    def buy_cond(self, row):
        return CE_ONLY().buy_cond(row) or RSI_ONLY().buy_cond(row) or MA_ONLY().buy_cond(row)

    def sell_cond(self, row):
        return CE_ONLY().sell_cond(row) or RSI_ONLY().sell_cond(row) or MA_ONLY().sell_cond(row)

class HL(Strategy):
    def __init__(self):
        super().__init__("HL", "JUST A CE")

    def buy_cond(self, row):
        return row['c'] > row['o']

    def sell_cond(self, row):
        return row['c'] < row['o']

class HL_HA(Strategy):
    def __init__(self):
        super().__init__("HL_HA", "JUST A CE")

    def buy_cond(self, row):
        print(row)
        return row['ha_c'] > row['ha_o']

    def sell_cond(self, row):
        return row['ha_c'] < row['ha_o']

strategies = [
    MACD_ONLY(),
    MACD_EXT(),
    MACD_MA(),
    MA_ONLY(),
    SMA_EXT(),
    CE_ONLY(),
    CE_MA(),
    CE_MACD(),
    MA_RSI(),
    RITA(),
    HL(),
    HL_HA()
]
