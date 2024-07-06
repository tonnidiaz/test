import time
from classes.OKX import OKX
from models.bot_model import Bot
from models.order_model import Order
from utils.funcs.orders3 import place_trade
from strategies.main import obj_strategies

def after_order_update(bot: Bot):
    # Check orders
    from utils.functions import bot_log, chandelier_exit, heikin_ashi, parse_date, parse_klines

    plat = OKX(bot)
    klines = plat.get_klines(end=(time.time() - bot.interval * 60) * 1000)
    if not klines:
        return bot_log(bot, "FAILED TO GET KLINES")
    
    df = chandelier_exit(heikin_ashi(parse_klines(klines)))
    from utils.functions2 import date_parse, new_date, calc_sl, calc_tp

    for i, row in df.tail(1).iterrows():
        bot_log(bot, "CANDLE")
        print(row.to_dict())

        strategy = obj_strategies[bot.strategy - 1]
        print(vars(strategy))
        orders = Order.find(Order.bot == bot.id, Order.ccy == bot.ccy, Order.base == bot.base).run()
        order = orders[-1] if len(orders) else None
        is_closed = order.is_closed if order else None

        ts = new_date(date_parse(row['ts']) + bot.interval * 60 * 1000)

        if  (is_closed or not order) and strategy.buy_cond(row):

            print(f"[ {bot.name} ]\tHAS BUY SIGNAL > GOING IN")
            amt = order.new_ccy_amt - abs(order.sell_fee) if order else bot.start_amt
            entry_limit = row['c']
            bot_log(bot, {'o': row['o'], 'c': row['c'], 'entry_limit': entry_limit})

            res: Order | None = place_trade(bot= bot, ts=parse_date(ts), amt=amt, side = 'buy', price=entry_limit, plat=plat )
            if res:
                # PLACE SELL ALGO ORDER
                bot_log(bot, "MARKET BUY ORDER FILLED. PLACING ALGO ORDER...")
                entry = res.buy_price
                amt = res.base_amt - res.buy_fee
                sl = calc_sl(entry)
                tp = calc_tp(entry)

                res = place_trade(bot= bot, ts=parse_date(ts), amt=amt, side = 'sell', price=tp, plat=plat, sl=sl )
                bot_log(bot, "ALGO ORDER PLACED. WAITING FOR NEXT RUN")

        """ elif not is_closed and order.side == 'sell' and order.order_id == '':
            bot_log("CHECK IF CAN_PLACE_ORDER...")
            entry = order.buy_price
            if  strategies[bot.strategy - 1].sell_cond(row, entry) or m_test:
                print(f"[ {bot.name} ]\tHAS SELL SIGNAL > GOING OUT")
                amt = order.base_amt
                place_trade(bot=bot, ts=row["timestamp"], price=row["close"], side="sell", amt=amt) """
                
