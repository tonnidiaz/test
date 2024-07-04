import json
from classes.binance import Binance
from classes.test_bin import TestBinance
from utils.constants import dfs_dir, klines_dir
from utils.functions import chandelier_exit, date_str_to_timestamp, heikin_ashi, parse_klines, tu_path
import os

# ETH -> 2021 -> 2022
# BTC -> 2022
symbols = ['EURUSDT', 'USDTZAR']
years = [ 2021 ]
intervals = [15]


def dld(parse = False):
    print("Begin download...")
    _bin = TestBinance()

    for year in years:
        print(f'\nYear {year}')

        for symb in symbols:
            print(f"SYMB: {symb}")
            for interval in intervals:
                print(f"interval: {interval}\n")
                fname = f"{symb}_{interval}m"

                fp = f"{dfs_dir}/{year}"
                klines_fp = f"{klines_dir}/{year}"

                if not os.path.exists(tu_path(fp)):
                    print("CREARTING DIR...")
                    os.mkdir(tu_path(fp))
                if not os.path.exists(tu_path(klines_fp)):
                    print("CREARTING DIR...")
                    os.mkdir(tu_path(klines_fp))

                fp = tu_path(f"{fp}/{fname}.csv")
                klines_fp = tu_path(f"{klines_fp}/{fname}.json")

                klines = _bin.get_klines(symb, start=date_str_to_timestamp(
                    f"{year}-01-01 00:00:00"), end=date_str_to_timestamp(f"{year}-12-31 23:59:00"), interval=interval, save_fp=klines_fp)
                
                if parse:
                    df = chandelier_exit(heikin_ashi(parse_klines(klines)))
                    df.to_csv(fp)
                print(f"DONE interval: {interval}\n")

            print(f"DONE SYMB: {symb}\n")

        print(f'DONE Year {year}\n')

    print("DOWNLOADER FINISHED")

def create_dfs(year, interval, symb):
     fname = f"{symb}_{interval}m"
     k_fp = f"{klines_dir}/{year}/{fname}.json"
     fp = f"{dfs_dir}/{year}"
     print(f"Begin: {year}, {interval}m, {symb}\n")
     if os.path.exists(k_fp):
         if not os.path.exists(fp):
            os.mkdir(tu_path(fp))
         fp = f"{fp}/{fname}.csv"
         with open(k_fp) as f:
             klines = json.load(f)
         df = chandelier_exit(heikin_ashi(parse_klines(klines)))
         df.to_csv(fp)
         print(f"DONE with: {year}, {interval}m, {symb}\n")

def create():
    years = [2020,2022,2023]
    intervals = [15]
    symb = ["SOLUSDT"]

    for year in years:
        for symb in symbols:
            for interval in intervals:
                create_dfs(year, interval, symb)

symb = "BTCUSDT"
def fun(symb: str, start: str, end: str):
    _bin = TestBinance()
    klines = _bin.get_klines(symb, start=date_str_to_timestamp(
                    f"{start}"), end=date_str_to_timestamp(f"{end}"), interval=15, save_fp=f'data/{symb}.json')
    print("DONE")

fun(symb, "2024-04-02 00:00:00", "2024-06-01 23:59:00")