from datetime import datetime
import json

import requests
from classes.test_platforms import Platform
from data.data import data as dt



class TestBinance(Platform):
    maker = .1/100
    taker = .1/100
    def get_klines(self, symbol = None, start = None, end = None, interval = None, save_fp = None):
        from utils.functions import err_handler
        from utils.functions2 import new_date
        try:
            cnt = 0
            klines = []
            symbol = symbol if symbol else dt.symbol
            interval = interval if interval else dt.interval
            interval = int(interval)
            end = end if end is not None else int(datetime.now().timestamp() * 1000)
            parsed_interval = f"{interval}m" if interval < 60 else f"{int(interval/ 60)}h"
            print(f"{end}") 
            if start is not None:
                first_timestamp = int(start)
                while first_timestamp <= end:
                    print(f"GETTING {cnt + 1} klines...")
                    print(first_timestamp)
                    print(new_date(first_timestamp))
                    res = requests.get(f"https://data-api.binance.vision/api/v3/klines?symbol={symbol}&interval={parsed_interval}&startTime={first_timestamp}")
                    data = res.json()
                    klines = [*klines, *data]
                    if len(data) == 0:
                        break
                    first_timestamp = int(float(data[-1][0])) + int(interval) * 60 * 1000
                    if save_fp:
                        with open(save_fp, 'w') as f:
                            json.dump(klines, f)
                            print("saved")
                    cnt += 1
            else:
                res = requests.get(f"https://data-api.binance.vision/api/v3/klines?symbol={symbol}&interval={parsed_interval}&endTime={end}")
                klines =  res.json()
            
            if save_fp:
                with open(save_fp, 'w') as f:
                    json.dump(klines, f)
            if type(klines) is not list:
                
                print(klines)
                raise Exception({'msg': "ERROR FETCHING KLINES"})

            print(len(klines))
            print(f"Done fetching klines")
            return klines
        
        except Exception as e:
            err_handler(e)
            