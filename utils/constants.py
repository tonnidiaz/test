from flask_apscheduler import APScheduler


MAKER_FEE_RATE = .1/100
TAKER_FEE_RATE = .08/100
klines_dir = 'data/klines/binance'
dfs_dir = 'data/dfs/binance'
details = {
    'title': 'TuTrader',
    'admin_email': 'tunedstreamz@gmail.com',
    'developer': {'email': 'tunedstreamz@gmail.com'}
}


demo = True
#platforms = ["bybit", "okx"]
scheduler = APScheduler()
dfs_root_dir = "data/dfs"
klines_root_dir = "data/klines"

is_market = False
cancel_on_cond = False
use_ha_close = False
demo = True
is_stop_order = False
use_swind_low = False

SL = 0.2
TP = 3.5  # 5.3

