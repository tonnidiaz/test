## CURR STRATEGY
Order = dict
buy_px = 5
sell_px = 10

pos = Order.side == 'sell' and not Order.is_closed
entryLimit = buy_px != 0
exitLimit = sell_px != 0

prev: dict
row: dict
is_green = prev.c >= prev.o
entry = 0
SL2 = .5

# CHECK PREVIOUS STUFF

if pos and exitLimit:
   # PLACE MARKET OCO SELL AT EXIT LIMIT
   pass

buy_cond = True
sell_cond = True

# ON THE SAME CANDLE
if not pos and buy_cond:
    # CHECK FOR BUY SIGNAL IF POS IS CLOSED OR PREV_BUY_ORDER WAS NOT FILLED
    # PLACE MARKET BUY
    entryLimit = row.o
    # ENTRY_LIMIT SET, WAIT FOR NEXT ROUND

elif pos and sell_cond:
    # CHECK SELL SIGNAL ON STARTUP AND SET EXIT_LIMIT
    exitLimit = prev.ha_h

# KEEP LISTENING TO ORDER CHANGES
