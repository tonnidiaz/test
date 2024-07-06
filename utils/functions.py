import traceback
import pandas as pd
import pandas_ta as pta
import numpy as np
from models.bot_model import Bot
from utils.constants import *
import os, pytz
import requests
from datetime import datetime, timezone

from utils.functions2 import new_date

def dd_num(e):
    e = str(e).strip()
    return f"0{e}" if len(e) == 1 else e

    
from utils.consts import TZ, date_format

def parse_date(date: str | datetime):
    """ if type(date) is datetime:

        date = date.isoformat(sep=" ")
    print(date)
    dt_obj = datetime.strptime(date, date_format)

    dt_obj = dt_obj.replace(tzinfo=timezone.utc)
    dt_obj = dt_obj.astimezone(pytz.timezone(TZ)) """
    if type(date) is str:
        date = datetime.strptime(date, date_format)
    #date = date.replace(tzinfo=timezone.utc)
    date = date.astimezone(pytz.timezone(TZ))
    return date.strftime(date_format)


def tu_path(pth: str):
    return os.path.join(*pth.split("/"))


def is_dev():
    return os.environ['ENV'] != 'prod'

def parse_klines(klines):
    """KLINES SHOULD COME IN SORTED [REVERSED] IF NEED BE"""
    print("\nBEGIN PARSE...")
    # Grab only 7 columns
    klines = list(map(lambda x: x[0: 6], klines))
    df = pd.DataFrame(klines, columns = ['ts', 'o', 'h', 'l', 'c', 'v'], dtype=float)
    #df['ts'] = pd.to_datetime(df['ts'], unit='ms',)
    df['ts'] = df['ts'].astype(str)
    for i, row in df.iterrows():
        df.loc[i, 'ts'] = parse_date(new_date(float(row['ts'])) )

    print("END PARSE\n")
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

    #df['atr'] = pta.atr(df['h'], df['l'], df['c'], length)
    #df['long_stop'] = df['c'].rolling(window=length).max() - df['atr'] * mult
    #df['long_stop_prev'] = df['long_stop'].shift(1)

    #df['short_stop'] = df['c'].rolling(window=length).min() + df['atr'] * mult
    #df['short_stop_prev'] = df['short_stop'].shift(1)

    #df['sir'] = df['buy_signal'] = df['sell_signal'] = np.nan
    sir = 1
    c = 'ha_c' if use_ha_close else 'c'
    df['sma_20'] = pta.ema(df[c], 20)
    df['sma_50'] = pta.ema(df[c], 50)

    df['rsi'] = pta.rsi(df[c], 14)
    macd = pta.macd(df[c])

    #print(macd)

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
    #df = df[['ts', 'o', 'h', 'l', 'c', 'sma_20', 'sma_50', 'buy_signal','sell_signal']]
    
    print("CE COMPLETE")
    return df
 
def heikin_ashi(df : pd.DataFrame):
    print("BEGIN HA...")
    ha = df.copy()
    ha_c = (df['o'] + df['h'] + df['l'] + df['c']) / 4
    ha_o = (df['o'].shift(1) + df['c'].shift(1)) / 2
    ha_h = df[['h', 'c', 'o']].max(axis=1)
    ha_l = df[['l', 'c', 'o']].min(axis=1)

    ha['ha_o'] = ha_o
    ha['ha_h'] = ha_h
    ha['ha_l'] = ha_l
    ha['ha_c'] = ha_c
    print("HA COMPLETE")
    print(ha['ha_c'][0])
    return ha

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
        print(new_date(first_timestamp))
        res = requests.get(f"https://api.bybit.com/v5/market/kline?category=spot&symbol={symbol}&interval={interval}&start={first_timestamp}")
        #print(res.json())
        res : list = res.json()['result']['list']
        if len(res):
            
            first_timestamp = round(float(res[0][0])) + interval * 60 * 1000
            klines = [*res, *klines]
        cnt +=1
    klines.reverse()
    print("DONE")

def get_interval(m: int, plt: str) -> str:
    if plt == "okx":
        if m >= 60:
            return f"{m // 60}H"
        else:
            return f"{m}m"
    else:
        return f"{m}m"


def bot_log(bot: Bot, data):
    print(f"\n[{bot.name}]\t{data}\n")