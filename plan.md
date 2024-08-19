# Plans and ideas

- FIND ACTIVE BOT WITH SUBED SYMBOL AND POS 

- Rmv botId from botsWithPos
- Place Market buy
- Update pos on next candle:
    Add botId to wsOkx botsWithPos
- RMV BOT_ID
- Place necessary orders for bot in botsWithPos if price conds met
- Update order


## CURR STRATEGY

    [ pos = Order.side == sell && !Order.is_closed
      entryLimit = buy_px != 0
      exitLimit = sell_px != 0
    ]

- If pos & entryLimit:
    isHaHit = prev.ha_l < entryLimit < prev.o
    entryFromLow = prev.l diff entryLimit

    if isHaHit && entryFromLow < .5: # LESS THAN .5% DIFF BETWEEN LOW AND ENTRY
        
