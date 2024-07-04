import pandas as pd

def fill_sell_order(exit_limit: float | None, exit: float, prev_row: pd.Series, base: float, enter_ts: str, price_precision: int, m_data: dict, balance: float, entry: float, cnt: float, loss: float, gain: float, sl: float | None, tp: float | None, entry_limit: float | None, pos: bool):
    balance = base * exit
    balance = round(balance, price_precision)

    ts = prev_row['ts']
    k = m_data['data'].get(ts)
    m_data['data'][f"[SELL] {ts}" if k else ts] = {
        "side": f"sell \t {{h: {prev_row['h']}, l: {prev_row['l']}}}",
        "fill": exit_limit,
        "enterTs": enter_ts,
        "c": exit,
        "balance": f"[{base}] \t {balance} {{ {round((exit - entry)/entry * 100, 2)}% }}",
    }
    
    base = 0
    exit_limit = None


    if (exit >= entry): gain += 1
    else: loss += 1

    cnt += 1
    entry_limit = None
    tp = None
    sl = None
    pos = False

    return {
        "entry_limit": entry_limit,
        "exit_limit": entry_limit,
        "base": base,
        "pos": pos,
        "balance": balance,
        "cnt": cnt,
        "sl": sl, "tp": tp, "gain": gain, "loss": loss,
        "m_data": m_data,
    }

def fill_buy_order(entry: float, prev_row: pd.Series, taker: float, enter_ts: str, base: float, balance: float, base_precision: int, m_data: dict, entry_limit: float, pos: bool,):
    print("FILLL BUY ORDER")
    print(balance, entry, base_precision)
    base = round(balance / entry, base_precision)
    data = { **m_data }
    ts = prev_row['ts']
    k = data["data"].get(ts)
    data["data"][ f"[BUY] {ts}" if k else ts] = {
        "side": f"buy \t {{h: {prev_row['h']}, l: {prev_row['l']}}}",
        "fill": entry_limit,
        "base": base,
        "enterTs": enter_ts,
        "c": entry,
        'balance': f"[{balance}] \t {base} \t -{base * taker}",
    }
    return { 'pos': True, "base": base, "balance": balance, "m_data": data, "_cnt": 0 }