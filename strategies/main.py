from classes.index import Strategy
from strategies.macd import strategies as macd_strategies
from strategies.ce_sma import strategies as ce_ma_strategies

obj_strategies : list[Strategy] = [*macd_strategies, *ce_ma_strategies]
strategies = list(map(lambda el: el.__dict__ , obj_strategies))