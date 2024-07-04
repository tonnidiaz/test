from datetime import datetime
import json
from utils.constants import demo
from os import getenv
from okx.MarketData import MarketAPI
from pybit.market import Market

from utils.functions import parse_date
from utils.functions2 import ensure_dir_exists, get_interval, new_date

class Platform:
    name: str
    maker: float
    taker: float

    def get_klines(self,interval: float, start: int | None,end: int | None, symbol: str, save_pth: str | None) -> list | None:
        pass

class TestOKX(Platform):
    name = "OKX"
    maker = 0.08 / 100
    taker = 0.1 / 100
    market_data: MarketAPI
    flag: str
    api_key: str
    api_secret: str
    passphrase: str
    def __init__(self):
        super().__init__()
        self.flag = "1" if demo else "0"
        self.api_key =  getenv("OKX_API_KEY_DEV!") if demo else getenv("OKX_API_KEY!")
        self.api_secret = getenv("OKX_API_SECRET_DEV!") if demo else getenv("OKX_API_SECRET!")
        self.passphrase = getenv("OKX_PASSPHRASE!")

        self.market_data = MarketAPI(
                api_key= self.api_key,
                api_secret= self.api_secret,
                passphrase= self.passphrase,
                flag=self.flag)


    def get_klines(self,
        end: int | None,
        start: int | None,
        interval: int,
        symbol: str,
        savePath: str | None,
        is_bybit: bool
    ):
        market_data = Market()
        end = end if end is not None else datetime.now()
        klines = []
        cnt = 0
        print(f"[ {'ByBit' if is_bybit else self.name} ] \t GETTING KLINES.. FOR " + symbol)

        if (start):
            start = (start if is_bybit else start - interval * 60 * 1000) - 20 * interval * 60000 #ACCORDING TO RETURNED DATA
    
            first_ts = start
            while (first_ts <= end):
                print(f"GETTING {cnt + 1} KLINES...")
                limit = 100
                after = first_ts + (limit - 1) * interval * 60 * 1000
                print(f"Before: {parse_date(new_date(first_ts))} \t After: {parse_date(new_date(after))}" )
                print("GETTING MARK PRICE")

                if is_bybit:
                    res = market_data.get_kline(
                        category="spot",
                        symbol=symbol,
                        interval=interval,
                        start=first_ts
                    )
                    data = res.result['list']
                else:
                    res = self.market_data.get_history_candlesticks(
                        symbol,
                        get_interval(interval, "okx"),
                        before=first_ts,
                        after=after,
                        limit=limit
                    )
                    data = res
                if (not len(data)):
                    break
                _data = [*data]
                _data.reverse()
                klines.append(_data)

                first_ts = int(data[0][0]) + interval * 60 * 1000
                print(new_date(first_ts).isoformat())
                if (savePath):
                    ensure_dir_exists(savePath)
                    with open(savePath, 'w') as fp:
                        json.dump(klines, fp)
                    print("Saved")
                
                cnt += 1
            
        else:
            if is_bybit:
                res = market_data.get({
                    "category": "spot",
                    "symbol": symbol,
                    "interval": interval,
                    "start": start,
                    "end": end,
                })
            else:
                res = self.market_data.get_history_candlesticks(
                    symbol,
                    bar=get_interval(interval, "okx"),before = f"{start}" if start else None,after= f"{end}" if end else None,
                )
            data = res.result.list if is_bybit else res
            _data = [*data]
            _data.reverse()
            klines = _data
    

        d = [*klines]
        print(d[-1])
        return d
    
class TestBybit(Platform):
    def __init__(self):
        self.name = "ByBit"
    
    def get_klines(self, start=None, end=None, save_path=None, interval=None, symbol=None):
        return TestOKX().get_klines(
            start=start,
            end=end,
            save_path=save_path,
            interval=interval,
            symbol=symbol,
            is_bybit=True
        )