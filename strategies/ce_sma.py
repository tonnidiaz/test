
# Define specific strategy classes
from typing import List
from classes.index import Strategy

fast_rsi = 50

class RSI_ONLY(Strategy):
    def __init__(self):
        self.name = "RSI ONLY"
        self.desc = "Enter: RSI < fastRSI, Exit: RSI > 100 - fastRSI"

    def buy_cond(self, row: dict) -> bool:
        return row['rsi'] < fast_rsi

    def sell_cond(self, row: dict) -> bool:
        return row['rsi'] > 100 - fast_rsi

class ANY(Strategy):
    def __init__(self):
        self.name = "ANY"
        self.desc = "Enter: True, Exit: True"

    def buy_cond(self, row: dict) -> bool:
        return True

    def sell_cond(self, row: dict) -> bool:
        return True

# Add more strategy classes as needed

# List of strategies
strategies: List[Strategy] = [
    RSI_ONLY(),
    ANY()
    # Add more strategy instances here if needed
]