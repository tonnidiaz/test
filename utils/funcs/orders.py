from datetime import datetime
from classes.OKX import OKX
from models.bot_model import Bot
from models.order_model import Order
from utils.constants import scheduler
from utils.funcs.orders2 import after_order_update


test = False


def update_order(bot: Bot):
    """CHECKS THE SELL ALGO ORDERS"""
    from utils.functions import bot_log, err_handler, parse_date
    from utils.functions2 import new_date

    orders = Order.find(
        Order.bot == bot.id, Order.base == bot.base, Order.ccy == bot.ccy
    ).run()
    is_closed = True
    order = None

    if not len(orders):
        return is_closed, order

    elif len(orders) and not orders[-1].is_closed:
        okx = OKX(bot)
        order = orders[-1]
        print(f"LAST_ORDER: {order}\n")
        is_closed = order.is_closed
        is_sell_order = len(order.order_id) > 0

        oid = order.order_id if is_sell_order else order.buy_order_id
        res = okx.get_order_by_id(oid, is_algo=is_sell_order)

        _is_closed = res and res != "live"

        if is_sell_order:
            

            if _is_closed:
                bot_log(bot, "UPDATING SELL ORDER...")
                fee = abs(res["fee"])  # In USDT

                # Buy/Base fee already removed when placing sell order
                order["new_ccy_amt"] = res["fill_sz"] * res["fill_px"]
                order["sell_price"] = res["fill_px"]
                order["is_closed"] = True
                order["sell_fee"] = fee
                order["sell_timestamp"] = {
                    **order["sell_timestamp"],
                    "o": parse_date(new_date(res["fill_time"])),
                }

                # Calculate balance and profit
                bal = order["new_ccy_amt"] - abs(res["fee"])
                profit = ((bal - order["ccy_amt"]) / order["ccy_amt"]) * 100
                order["profit"] = profit
                order["order_id"] = res["id"]
                order.save()
                bot_log(bot, "SELL ORDER UPDATED")
                is_closed = True
        
        else:
            if bot.order_type == "Market":
                return bot_log(bot, "WARN: TRYNA UPDATE ALREADY UPDATED ORDER")

            if _is_closed:
                order.buy_price = float(res["fillPx"])
                order.buy_fee = float(res["fee"])
                order.base_amt = float(res["fillSz"])
                order.side = "sell"
        
        order.save()
        bot.save()
        if res == 'live':
            return res
    return is_closed, order


class OrderPlacer:
    cnt = 0
    last_check_at: datetime | None = None
    bot: Bot

    def __init__(self, bot: Bot) -> None:
        print(f"\ninit OrderPlacer...\n")
        self.bot = bot

    def set_cnt(self, val):
        self.cnt = val

    def get_cnt(self):
        return self.cnt

    def check_n_place_orders(self):
        from utils.functions import bot_log, err_handler, parse_date

        bot = Bot.find_one(Bot.id == self.bot.id).run()
        prod_time_condition = False
        if not bot:
            return

        try:
            now = datetime.now()
            curr_min = now.minute

            m_test = test and len(Order.find(Order.bot == bot.id).run()) <= 2
            m = (int(f"{curr_min}"[1]) if curr_min >= 10 else curr_min)
            prod_time_condition = (
                bot.active and m % bot.interval == 0
                and (
                    f"{self.last_check_at.hour}:{self.last_check_at.minute}"
                    != f"{now.hour}:{now.minute}"
                    if self.last_check_at
                    else True
                )
            )
            if prod_time_condition:
                bot_log(bot, f"CURR_MIN: [{curr_min}] => {bot.interval}, PTC: {prod_time_condition},M: {m} ")
                self.last_check_at = datetime.now()
                scheduler.pause_job(str(bot.id))

                if bot.active:
                    res = update_order(bot)
                    if not res:
                        return bot_log(
                            bot,
                            "DID NOT GO ON WITH PROCESS SINCE COULD NOT UPDATE ORDER",
                        )
                    elif res != 'live':
                        after_order_update(bot)
                    else:
                        bot_log(bot, "[LIVE] ORDER NOT YET FILLED")

        except Exception as e:
            err_handler(e)

        finally:
            # RESUME JOB
            
            if prod_time_condition:
                bot = Bot.find_one(Bot.id == bot.id).run()
                if bot and bot.active:
                    scheduler.resume_job(str(bot.id))
                    bot_log(bot, "JOB RESUMED")
