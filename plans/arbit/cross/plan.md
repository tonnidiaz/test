# MAIN PLANS FOR CROSS-EXCHANGE ARBITRAGE BOT

## CROSS_WS BOT
- **Schema:**
  - platA, platB
  - cross_arbit_orders: [{plat: A | B, state: live | withdrawing | withdrawn}]

- Place buy order on A:
  - plat = A, state = live, side: buy
- Buy order filled: 
  - withdraw from A -> B:
  - state = **withdrawing**