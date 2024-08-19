
## BILLO STRATEGY

    [ pos = Order.side == sell && !Order.is_closed
      entryLimit = buy_px != 0
      exitLimit = sell_px != 0
    ]

- If pos & entryLimit:
    isHaHit = prev.ha_l < entryLimit < prev.o
    entryFromLow = prev.l diff entryLimit

    if isHaHit && entryFromLow < .5: # LESS THAN .5% DIFF BETWEEN LOW AND ENTRY
        
