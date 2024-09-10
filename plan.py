# CROSS_WS BOT
# - schema:
#   - platA, platB
#   - cross_arbit_orders: [{curr_plat: A | B, state: live | withdrawing | withdrawn}]

# - Place buy order on A:
#   - curr_plat = A, state = live, side: buy
# - Buy order filled: 
#   - withdraw from A -> B:
#   - state