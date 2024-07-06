from datetime import datetime
import json
import os
from flask_socketio import emit
from classes.test_platforms import TestOKX
from utils.functions import chandelier_exit, heikin_ashi, parse_date, parse_klines, tu_path
from strategies.main import  obj_strategies
from utils.constants import klines_root_dir
from utils.consts import platforms
from utils.functions2 import  date_parse, new_date


def on_backtest(body, is_io = True):
    symbol = body.get('symbol')
    base_ccy = symbol
    symbol = "".join(base_ccy)

    interval = body.get('interval')
    start = body.get('start')
    end = body.get('end')
    platform = int(body.get('platform'))
    offline = body.get('offline')
    print(offline)
    start_ts = date_parse(start) if start else start
    end_ts = date_parse(end) if end else end

    fp = tu_path('data/klines/binance/klines.json') if False else None
    print(start, end)
    if is_io:
        emit('backtest', 'Getting klines...')
    plat_nm = platforms[platform].name.lower()
    plat = platforms[platform].obj
    symbol = "-".join(base_ccy) if isinstance(plat, TestOKX) else "".join(base_ccy)

    if offline:
        print("IS OFFLINE")
        start = start if start is not None else str(datetime.now())
        year = start.split('-')[0]
        klines_path = tu_path(f"{klines_root_dir}/{plat_nm}/{year}/{symbol}_{interval}m.json")
        print(klines_path)

        if not os.path.exists(klines_path):
            err = {'err': f'DataFrame for {symbol} in {year} at {interval}m does not exist'}
            if is_io:
                emit('backtest', err)
            return err
        with open(klines_path) as f:
            klines = json.load(f)

        
    else:
        
        klines = plat.get_klines(symbol, interval=interval, start=start_ts, end=end_ts, save_fp=fp)
        if not klines:
            if is_io:
                emit("err", "FAILED TO GET KLINES")
            return

    if is_io:
        emit('backtest', 'Analizing data...')
    klines = list(filter(lambda el: el[0] <= date_parse(end) and el[0] >= date_parse(start), klines))
    df = chandelier_exit(heikin_ashi(parse_klines(klines)))
    #print(df)
    if offline:
        print("HERE")
        print(end, df['ts'][0])
        df = df
        #df = df.query('ts ') # df[(date_parse(df['ts']) <= date_parse(end)) & (date_parse(df['ts']) >= date_parse(start))]
        
    bal = float(body.get('bal'))

    if is_io:
        emit('backtest', 'Backtesting...') 
    str_num = int(body.get('strategy'))
    print(f"STR_NUM {str_num}")
    data = obj_strategies[str_num - 1].run(df=df,balance=bal,pair=base_ccy,maker=plat.maker,taker=plat.taker)
    data['profit'] = round(data['balance'] - bal,2 if base_ccy[1] == "USDT" else 6)
    data = {**data, 'base': base_ccy[0], 'ccy': base_ccy[1]}

    """ for k, v in data['data'].items():
        data['data'][k]['ts'] = parse_date(k) """

    print(f"\nPROFIT = {base_ccy[1]} {data['profit']}")
    if is_io:
        emit('backtest', {"data": data})
    return {"data": data}

 