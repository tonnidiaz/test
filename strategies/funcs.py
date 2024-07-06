from data.data import data
from strategies.utils.funcs import fill_buy_order, fill_sell_order
from utils.constants import MAKER_FEE_RATE, SL, TAKER_FEE_RATE, TP, is_market
import pandas as pd

from utils.funcs3 import get_coin_precision, get_price_precision

def strategy(df: pd.DataFrame, balance: float, buy_cond, sell_cond, pair: list[str], maker: float, taker: float):

    pos = False; 
    cnt = 0
    _cnt = 0
    gain = 0
    loss = 0

    m_data = { 'data': [] }
    _data = {}
    entry: float = 0
    entry_limit: float | None = None
    exit_limit: float | None = None
    tp: float | None = None
    base: float = 0
    sl: float | None = None
    exit: float = 0
    enter_ts = ""
    skip = ""
    profit: float = 0

    price_precision = get_price_precision(pair, "bybit")
    base_precision = get_coin_precision(pair, "sell", "bybit")
    print("CE_SMA: BEGIN BACKTESTING...\n")

    for i, row in df.iterrows():
        if i <= 0: continue

        prev_row = df.loc[i - 1]
        print(f"\nTS: {row['ts']}")
        
        def _fill_sell_order(ret):
            nonlocal exit_limit, exit, prev_row, entry, base, balance, price_precision, enter_ts, gain, loss, cnt, m_data, pos, sl, tp, entry_limit
            pos = ret["pos"]
            m_data = ret["m_data"]
            sl = ret["sl"]
            balance = ret["balance"]
            tp = ret["tp"]
            entry_limit = ret["entry_limit"]
            exit_limit = ret.get("exit_limit")
            cnt = ret["cnt"]
            gain = ret["gain"]
            base = ret["base"]
            loss = ret["loss"]
            print({'tp': ret['tp'], 'sl': ret['sl']})
            
        def _fill_buy_order(ret: dict):
            nonlocal m_data, base, balance, _cnt, pos, base, enter_ts, sl, tp
            m_data = ret['m_data']
            base = ret['base']
            balance = ret['balance']
            _cnt = ret['_cnt']
            pos = ret['pos']
            base = ret['base']

            enter_ts = row["ts"]
            tp = round(entry * (1 + TP / 100), price_precision)
            sl = round(entry * (1 - SL / 100), price_precision)

        if skip == prev_row['ts']:
            pass
        
        if not pos and entry_limit:
            if prev_row['l'] <= entry_limit:
               
                entry = entry_limit
                ret = fill_buy_order( entry=entry, prev_row=prev_row, 
                entry_limit = entry_limit, enter_ts=enter_ts, 
                taker = taker, base = base, balance = balance, 
                base_precision=base_precision, m_data = m_data, pos = pos,)
                
                _fill_buy_order(ret)
                
        if pos and (sl or tp):
            print('HAS POS OR SL')

            _tp = tp
            _sl = sl
            _pos = pos

            is_sl = sl and row['l'] <= sl

            if sl and sl < entry and is_sl:
                print("FILL AT SL")
                exit = round(sl, price_precision)

                ret = fill_sell_order(exit_limit, exit, row, entry=entry, base = base, balance = balance, price_precision = price_precision, enter_ts = enter_ts, gain = gain, loss = loss, cnt = cnt, m_data = m_data, pos = pos, sl = sl, tp = tp, entry_limit = entry_limit)
                _fill_sell_order(ret)
            elif tp and tp <= row['h']:
                print("FILL AT TP")
                exit = round(tp, price_precision)

                ret = fill_sell_order(exit_limit, exit, row, entry=entry, base = base, balance = balance, price_precision = price_precision, enter_ts = enter_ts, gain = gain, loss = loss, cnt = cnt, m_data = m_data, pos = pos, sl = sl, tp = tp, entry_limit = entry_limit)
                _fill_sell_order(ret)

            if not pos:
                print({"entry": entry})
                skip = row['ts']

        if (not pos and buy_cond(prev_row)):
            # PLACE MARKET BUY ORDER */
            entry_limit = row['o'] if is_market else prev_row['c']
            entry_limit = round(entry_limit, price_precision)
            enter_ts = row['ts']
            print(f"[ {row.ts} ] {'Market' if is_market else 'Limit'} buy order at {entry_limit}")

            if is_market:
                entry = entry_limit
                ret = fill_buy_order( entry=entry, prev_row=prev_row, 
                entry_limit = entry_limit, enter_ts=enter_ts, 
                taker = taker, base = base, balance = balance, 
                base_precision=base_precision, m_data = m_data, pos = pos,)
                
                _fill_buy_order(ret)

    print(f"TOTAL TRADES: {cnt}")
    cnt = cnt if cnt > 0 else 1
    gain = round(gain * 100 / cnt, 2)
    loss = round(loss * 100 / cnt, 2)
    m_data = {**m_data, 'balance': round(balance , price_precision),
              'trades': cnt, "gain": gain, 'loss': loss}
    return m_data

