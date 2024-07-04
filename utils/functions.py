import traceback
import pandas as pd
import pandas_ta as pta
import numpy as np
from models.bot_model import Bot
from utils.constants import *
import os, pytz
import requests
from datetime import datetime, timezone

def dd_num(e):
    e = str(e).strip()
    return f"0{e}" if len(e) == 1 else e

def to_iso_string(date_str):
    date_arr = date_str.split(",")
    time = date_arr[1].split(":")
    time = ":".join([dd_num(el) for el in time])

    date_arr = date_arr[0].split("/")
    date = f"{date_arr[2]}-{dd_num(date_arr[0])}-{dd_num(date_arr[1])}"

    return f"{date} {time} GMT+2"

def parse_date(date: str | datetime):
    if type(date) is datetime:
        date = date.isoformat(sep=" ")
    dt_obj = datetime.strptime(date, "%Y-%m-%d %H:%M:%S")

    dt_obj = dt_obj.replace(tzinfo=timezone.utc)
    dt_obj = dt_obj.astimezone(pytz.timezone('Africa/Johannesburg'))
    return dt_obj.strftime("%Y-%m-%d %H:%M:%S")


def tu_path(pth: str):
    return os.path.join(*pth.split("/"))


def is_dev():
    return os.environ['ENV'] != 'prod'

def parse_klines(klines):
    """KLINES SHOULD COME IN SORTED [REVERSED] IF NEED BE"""

    # Grab only 7 columns
    klines = list(map(lambda x: x[0: 6], klines))
    df = pd.DataFrame(klines, columns = ['ts', 'o', 'h', 'l', 'c', 'v'], dtype=float)
    #df['ts'] = pd.to_datetime(df['ts'], unit='ms',)
    for i, row in df.iterrows():
        df.loc[i, 'ts'] = parse_date(datetime.fromtimestamp(row['ts'] / 1000) )
    return df
 
def zlsma(df: pd.DataFrame, length = 32, offset = 0):
    src = df['c']
    lsma = pta.linreg(src, length, offset)
    lsma2 = pta.linreg(lsma, length, offset)
    zlsma = None
    if lsma is not None and lsma2 is not None:
        eq= lsma-lsma2
        zlsma = lsma+eq
    return zlsma

def err_handler(e: Exception):

    print(e)
    # Get the exception traceback
    tb = traceback.extract_tb(e.__traceback__)
    # Extract the last entry in the traceback
    filename, lineno, _, _ = tb[-1]
    # Print filename and line number
    print("Exception occurred in file:", filename, f"line {lineno}")

def tuned_err(code = 500, msg = "Something went wrong"):
    return f"tuned:{msg}", code



def chandelier_exit(df : pd.DataFrame, length = 1, mult = 1.8):

    print(f"BEGIN CE: {mult}")

    df['atr'] = pta.atr(df['h'], df['l'], df['c'], length)
    df['long_stop'] = df['c'].rolling(window=length).max() - df['atr'] * mult
    df['long_stop_prev'] = df['long_stop'].shift(1)

    df['short_stop'] = df['c'].rolling(window=length).min() + df['atr'] * mult
    df['short_stop_prev'] = df['short_stop'].shift(1)

    df['sir'] = df['buy_signal'] = df['sell_signal'] = np.nan
    sir = 1
    
    df['sma_20'] = pta.ema(df['c'], 20)
    df['sma_50'] = pta.ema(df['c'], 50)

    df['rsi'] = pta.rsi(df['c'], 14)

    """ for i, row in df.iterrows():
        if i > 0:
            lsp = df['long_stop'][i - 1] 
            ls = df['long_stop'][i]

            # short stop
            ssp = df['short_stop'][i - 1] 
            ss = df['short_stop'][i]

            if df['c'][i - 1] > lsp:
                ls = max(ls, lsp)

            df.loc[i, 'long_stop'] = ls
            df.loc[i, 'long_stop_prev'] = lsp
            
            # short stop
            if df['c'][i - 1] < ssp:
                ss = min(ss, ssp)
            
            df.loc[i, 'short_stop'] = ss
            df.loc[i, 'short_stop_prev'] = ssp
        if df['c'][i] > df['short_stop_prev'][i]:
            sir = 1
        elif df['c'][i] < df['long_stop_prev'][i]:
            sir = -1
        if i > 0:
            df.loc[i, 'sir']= sir
            df.loc[i, 'buy_signal'] = int(df['sir'][i] == 1 and df['sir'][i - 1] == -1)
            df.loc[i, 'sell_signal'] = int(df['sir'][i] == -1 and df['sir'][i - 1] == 1)
 """
    df = df[['ts', 'o', 'h', 'l', 'c', 'sma_20', 'sma_50', 'buy_signal','sell_signal']]
    
    print("CE COMPLETE")
    return df
 
def heikin_ashi(df : pd.DataFrame):
    print("BEGIN HA...")
    ha = df.copy()
    ha_c = (df['o'] + df['h'] + df['l'] + df['c']) / 4
    ha_o = (df['o'].shift(1) + df['c'].shift(1)) / 2
    ha_h = df[['h', 'c', 'o']].max(axis=1)
    ha_l = df[['l', 'c', 'o']].min(axis=1)

    df['ha_o'] = ha_o
    df['ha_h'] = ha_h
    df['ha_l'] = ha_l
    df['ha_c'] = ha_c
    print("HA COMPLETE")
    return df

cnt = 0
klines = []

def get_symbol(app: Bot):
    return f'{app.base}{app.ccy}'

def divide_chunks(l, n): 
      
    # looping till length l 
    for i in range(0, len(l), n):  
        yield l[i:i + n] 

def get_klines(symbol, interval, start: int, end = None, save_fp = None):
    # Get the klines since the start time
    # Get again from first[ts] + interval until first[ts] <= now <= first_timestamp + interval
    global cnt
    klines  = []
    first_timestamp = start
    print(f"GETTING KLINES FOR {interval}m")
    end = end if end is not None else datetime.now().ts() * 1000
    while first_timestamp <= end:
        print(f"GETTING {cnt + 1} klines...")
        print(first_timestamp)
        print(datetime.fromtimestamp(first_timestamp / 1000))
        res = requests.get(f"https://api.bybit.com/v5/market/kline?category=spot&symbol={symbol}&interval={interval}&start={first_timestamp}")
        #print(res.json())
        res : list = res.json()['result']['list']
        if len(res):
            
            first_timestamp = round(float(res[0][0])) + interval * 60 * 1000
            klines = [*res, *klines]
        cnt +=1
    klines.reverse()
    print("DONE")

