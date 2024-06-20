# curr_cundle = prev_candle in real_mode
#Check curr candle for signal

buy_price = None
sell_price = None
pos = False
entry = None
exit_price = None

for candle in []:

    if buy_price and not pos and candle.low <= buy_price <= candle.high:
        # Fill buy_pos
        entry = buy_price
        pos = True
        buy_price = None

    elif sell_price and pos and candle.low <= sell_price <= candle.high:
        # Fill sell_pos
        exit_price = sell_price
        pos = False
        sell_price = None
   
    if buy_signal and not pos:
        # place limit buy order at sma_50
        buy_price = sma_50
    
    elif sell_signal and pos:
        # Place limit sell order at sma_50
        sell_price = sma_50
        