# Place buy order
#   Check order status using buy_order_id
#   If order is not filled: Cannot place sell order
#   If order is filled: Can place sell order
# Place sell order
#   Change Order.side to sell
#   Add order_Id
#   Check status
# If closed: Update Order.status

from datetime import datetime
import re
import pytz
from models.bot_model import Bot
from utils.constants import scheduler
from utils.funcs.orders import OrderPlacer

def is_email(text):
    return re.fullmatch(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b',
				 text)

def tu_job(op: OrderPlacer, bot: Bot, id):
    with scheduler.app.app_context():
        """ print(f"JOB: {id}, RUN {op.cnt}")
        if op.cnt >= 10:
            scheduler.pause_job(id) """
        op.check_n_place_orders(bot)
        op.set_cnt(op.cnt + 1)


def add_bot_job(bot: Bot):
    op = OrderPlacer()
    job_id = str(bot.id)
    print(f"\nAdding job for bot: {bot.name}\n")
    scheduler.add_job(job_id, lambda : tu_job( op, bot, job_id) , trigger="interval", seconds= 1)


""" def parse_date(date):
    if isinstance(date, str):
        date = datetime.strptime(date, "%Y-%m-%d %H:%M:%S")
    date = date.astimezone(datetime.timezone(datetime.timedelta(hours=2)))
    return date.isoformat() """

def new_date(ts: float):
    return datetime.fromtimestamp(ts / 1000)

def date_parse(date: str):
    gmt = date.split(' ')[-1]
    date = date.replace(gmt, '').strip()
    # Parse the date string with PM/AM and GMT+2 timezone
    dt_obj = datetime.strptime(date, "%Y-%m-%d %I:%M:%S %p")  # Adjust format as needed
    
    # Convert to GMT+2 timezone
    tz = pytz.timezone('Etc/GMT-2')
    dt_obj = tz.localize(dt_obj)
    
    # Convert datetime object to Unix timestamp
    timestamp = int(dt_obj.timestamp() * 1000)
    return timestamp

import os

def ensure_dir_exists(file_path: str):
    dirname = os.path.dirname(file_path)
    if os.path.exists(dirname):
        return True
    ensure_dir_exists(dirname)
    print("Creating directory")
    os.mkdir(dirname)

def get_interval(m: int, plt: str) -> str:
    if plt == "okx":
        if m >= 60:
            return f"{m // 60}H"
        else:
            return f"{m}m"
    else:
        return f"{m}m"

