## CURR STRATEGY
Order = dict
buy_px = 5
sell_px = 10

pos = Order.side == 'sell' and not Order.is_closed
entryLimit = buy_px != 0
exitLimit = sell_px != 0

prev: dict
is_green = prev.c >= prev.o
entry = 0
SL2 = .5

# CHECK PREVIOUS STUFF
if not pos and entryLimit:

    sl = entryLimit * (1 + SL2/100)
    isHaHit = prev.ha_l < entryLimit
    entryFromLow = 0 # % diff between PREV.ha_; and prev.l

    if isHaHit and entryFromLow < .5: # LESS THAN .5% DIFF BETWEEN LOW AND ENTRY
        entryLimit *= (1 + entryFromLow / 100) # Adjust the entryLimit so the real low also reaches it 
        
    if (prev.l < entryLimit or prev.l < sl) and is_green:
        # PLACE MARKET BUY
        pos = True
        entry = entryLimit

elif pos and exitLimit:
    # IF POS WAS NOT CLOSED AT EXIT, CONSIDER SL
    sl = entry * ( 1 - SL2)

    if (sl < prev.h and not prev.is_green):
        #PLACE MARKET BUY
        pos = False


buy_cond = True
sell_cond = True
# ON THE SAME CANDLE
if not pos and buy_cond:
    # CHECK FOR BUY SIGNAL IF POS IS CLOSED OR PREV_BUY_ORDER WAS NOT FILLED
    entryLimit = prev.ha_c
    # ENTRY_LIMIT SET, WAIT FOR NEXT ROUND

elif pos and not exitLimit and sell_cond:
    # CHECK SELL SIGNAL AND SET EXIT_LIMIT
    exitLimit = prev.ha_c

row: dict
#AFTER SETTING EXIT LIMIT - LISTEN TO PRICES
if pos and exitLimit:
    isHaHit = exitLimit < row.ha_ha
    eFromH: float #% DIFF BETWEEN HIGH END EXIT
    isHit = exitLimit < row.h
    if isHaHit and eFromH < .5:
        # RE-ADJUST EXITLIMIT TO BE HIT BY REAL HIGH
        # PLACE MARKET SELL?
        pass

    elif isHaHit and isHit:
        #PLACE MARKET SELL

