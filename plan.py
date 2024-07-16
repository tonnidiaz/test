## CURR STRATEGY
Order = dict
buy_px = 5
sell_px = 10

pos = Order.side == 'sell' and not Order.is_closed
entryLimit = buy_px != 0
exitLimit = sell_px != 0

prev: dict
is_green = prev.c >= prev.o

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

elif pos and exitLimit:
    

