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
from utils.constants import SL, TP, scheduler
from utils.funcs.orders import OrderPlacer

def is_email(text):
    return re.fullmatch(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b',
				 text)

def tu_job(op: OrderPlacer, bot: Bot, id):
    with scheduler.app.app_context():
        """ print(f"JOB: {id}, RUN {op.cnt}") 
        if op.cnt >= 10:
            scheduler.pause_job(id) """
        op.check_n_place_orders()
        op.set_cnt(op.cnt + 1)


def add_bot_job(bot: Bot):
    op = OrderPlacer(bot)
    job_id = str(bot.id)
    print(f"\nAdding job for bot: {bot.name}\n")
    scheduler.add_job(id=job_id, func= lambda : tu_job( op, bot, job_id) , trigger="interval", seconds=1)


""" def parse_date(date):
    if isinstance(date, str):
    date = date.astimezone(datetime.timezone(datetime.timedelta(hours=2)))
    return date.isoformat() """

from utils.consts import TZ, date_format

def new_date(ts: float):
    """ Will be divided here """
    return datetime.fromtimestamp(ts / 1000, tz=pytz.timezone(TZ))

def date_parse(date: str):
    # Parse the date string with PM/AM and GMT+2 timezone
    dt_obj = datetime.strptime(date, date_format)  # Adjust format as needed
    dt_obj = dt_obj.astimezone(pytz.timezone(TZ))
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


def calc_sl(entry: float):
    return entry * (1 - SL/100)

def calc_tp(entry: float):
    return entry * (1 + TP/100)