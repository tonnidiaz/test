import pandas as pd
from classes.index import Strategy

class Str_1(Strategy):
    
    def __init__(self): 
        self.name = "Strategy 1"
        self.desc = """Exists when SMA_20 > SMA_50 and also there is a sell signal """
    
    def buy_cond(self, row):
        return row['buy_signal'] == 1 and (row['sma_20'] is not None and row['sma_50'] is not None and row['sma_20'] > row['sma_50'])

    def sell_cond(self, row, entry):
        return row['sell_signal'] and row['sma_20'] < row['sma_50']


class Str_2(Strategy):
    
    def __init__(self):
        self.name = "Strategy 2"
        self.desc = """Exists when SMA_20 > SMA_50 and also there is a sell signal  or tp >= 10%"""
    
    def buy_cond(self, row):
        return row['buy_signal'] == 1 and (row['sma_20'] is not None and row['sma_50'] is not None and row['sma_20'] > row['sma_50'])

    def sell_cond(self, row, entry):
        tp = entry * ( 1 + 10 / 100)
        return row['close'] >= tp or (row['sell_signal'] and row['sma_20'] < row['sma_50'])

    
class Str_3(Strategy):
    
    def __init__(self):
        self.name = "Strategy 3"
        self.desc = """Exists when SMA_20 > SMA_50 and also there is a sell signal  or price < 3%"""
    
    def buy_cond(self, row):
        return row['buy_signal'] == 1 and (row['sma_20'] is not None and row['sma_50'] is not None and row['sma_20'] > row['sma_50'])

    def sell_cond(self, row, entry):
        sl = entry * (1 - 3 / 100)
        return row['close'] < sl or (row['sell_signal'] and row['sma_20'] < row['sma_50'])

class Str_4(Strategy):
    
    def __init__(self):
        self.name = "Strategy 4"
        self.desc = """Exists when SMA_20 > SMA_50 and also there is a sell signal  or price < 2%"""
    
    def buy_cond(self, row):
        return row['buy_signal'] == 1 and (row['sma_20'] is not None and row['sma_50'] is not None and row['sma_20'] > row['sma_50'])

    def sell_cond(self, row, entry):
        sl = entry * (1 - 2 / 100)
        return row['close'] < sl or (row['sell_signal'] and row['sma_20'] < row['sma_50'])
    
    
class Str_5(Strategy):
    
    def __init__(self):
        self.name = "Strategy 5"
        self.desc = """Exists when SMA_20 > SMA_50 and also there is a sell signal  or price < 1.5%"""
    
    def buy_cond(self, row):
        return row['buy_signal'] == 1 and (row['sma_20'] is not None and row['sma_50'] is not None and row['sma_20'] > row['sma_50'])

    def sell_cond(self, row, entry):
        sl = entry * (1 - 1.5 / 100)
        return row['close'] < sl or (row['sell_signal'] and row['sma_20'] < row['sma_50'])

    
class Str_6(Strategy):
    
    def __init__(self):
        self.name = "Strategy 6"
        self.desc = """Exists when SMA_20 > SMA_50 and also there is a sell signal  or price < 1%"""
    
    def buy_cond(self, row):
        return row['buy_signal'] == 1 and (row['sma_20'] is not None and row['sma_50'] is not None and row['sma_20'] > row['sma_50'])

    def sell_cond(self, row, entry):
        sl = entry * (1 - 1 / 100)
        return row['close'] < sl or (row['sell_signal'] and row['sma_20'] < row['sma_50'])



strategies : list[Strategy] = [Str_1(), Str_2(), Str_3(), Str_4(), Str_5(), Str_6()]
