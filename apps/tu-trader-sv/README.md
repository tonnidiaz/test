# Tutrader

## Tri-arbitrage plan
- Check all tri-pairs simultaneously
    - Through ws
    - **Exp:** instantiate a new ws class instance for each bot
- Use whichever meets the min req
- Pause listeners and exec trades
    - ITrade {pair; startAmt; amt; profit}
- Unpause listeners