from datetime import datetime
import time
from typing import Optional
from classes.OKX import OKX
from models.bot_model import Bot
from models.order_model import Order
from utils.funcs3 import get_coin_precision, get_price_precision

from utils.types import OrderData


def place_trade(
    bot: Bot,
    amt: Optional[float],
    ts: str,
    price: float,
    plat: OKX,
    sl: Optional[float] = None,
    side="buy",
):
    from utils.functions import bot_log, parse_date
    orders = Order.find(
        Order.bot == bot.id, Order.base == bot.base, Order.ccy == bot.ccy
    ).run()

    if amt is None:
        # GET THE USDT BALANCE AND USE 75 IF THIS IS FIRST ORDER
        print(f"\n[ {bot.name} ]\tFIRST ORDER\n")
        amt = plat.get_bal(ccy=bot.ccy)

    print(f"[ {bot.name} ]\tAvail amt: {amt}\n")

    if not amt:
        raise Exception(f"[ {bot.name} ]\tFailed to get balance")

    px_pr = get_price_precision([bot.base, bot.ccy], bot.platform)

    bot_log(bot, f"Placing a {amt} {side} order at {price}...")

    # Setting stop-loss
    sl = round(sl if sl is not None else 0, px_pr)
    price = round(price, px_pr)

    # Calculate amount based on order type and side
    if bot["order_type"] == "Limit":
        if side == "buy":
            amt = amt / price

    # Get precision for the coin and adjust amount
    amt = round(
        amt,
        get_coin_precision(
            [bot["base"], bot["ccy"]],
            "sell" if bot["order_type"] == "Limit" else side,
            bot["platform"],
        ),
    )

    # Logging the final message
    bot_log(
        bot, f"Placing a {amt} {side} {bot['order_type']} SL: {sl} order at {price}..."
    )

    cl_order_id = str(int(time.time() * 1000))

    order = (
        Order(
            buy_price=price,
            buy_timestamp={"i": ts},
            side=side,
            bot=bot.id,
            base=bot.base,
            ccy=bot.ccy,
        )
        if side == "buy"
        else orders[-1]
    )

    order.cl_order_id = cl_order_id
    order.save()

    if side == 'buy':
        bot.orders.append(order.id)

    order_id = plat.place_order(
        amt, side=side, price=price, sl=sl, cl_order_id=cl_order_id
    )

    if not order_id:
        print(f"[ {bot.name} ]\tFAILED TO PLACE ORDER")
        return

    # Save order
    if side == "buy":
        order.buy_order_id = order_id
    else:
        order.order_id = order_id
        order.sell_timestamp = {'i': ts}
        order.sell_price = price
        order.side = side

    if side =='buy' and bot.order_type == "Market":
        # CHECK ORDER STATUS TILL FILLED
        filled  = False
        from utils.functions2 import new_date
        while not filled:
            time.sleep(5)
            res = plat.get_order_by_id(order_id = order_id)
            if not res:
                filled = True
                return bot_log(bot, "FAILED TO CHECK BUY MARKET ORDER")
            
            if type(res) == OrderData or dict:
                filled = True
                # UPDATE ORDER
                fee = res["fee"]
                base_amt = res["fill_sz"]

                # Assigning values to order
                order["buy_order_id"] = res["id"]
                order["buy_price"] = res["fill_px"]
                order["buy_fee"] = abs(fee)
                order["base_amt"] = base_amt
                order["ccy_amt"] = res["fill_sz"] * res["fill_px"]
                order["side"] = "sell"
                order["buy_timestamp"] = {**order.buy_timestamp, "o": parse_date(new_date(res['fill_time'])) } 
    order.save()
    bot.save()
    print(f"\n[ {bot.name} ]\tBuy order placed, Bot updated\n")

    if side == 'buy':
        return order
