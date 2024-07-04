from strategies.funcs import strategy


class Strategy:
    def __init__(self, name, desc):
        self.name = name
        self.desc = desc

    def buy_cond(self, row):
        raise NotImplementedError

    def sell_cond(self, row):
        raise NotImplementedError
    
    def run(self, df, balance, pair, maker, taker, lev=1, p_gain=None):
        print(f"\nRunning {self.name} strategy [{self.desc}] \t {pair}\n")

        m_data = strategy(
            df=df,
            balance=balance,
            buy_cond=self.buy_cond,
            sell_cond=self.sell_cond,
            pair=pair,
            maker=maker,
            taker=taker
        )

        return m_data
