# LIMIT TRI-ARBITRAGE PLAN

- Check for signal [Using prev closing prices]
- Place limit order
- If filled:
    - Place rest of orders
    - Repeat wit orders 2 & 3
- else:
    - Exit pos if stop-loss is reached
    - Place rest of orders
