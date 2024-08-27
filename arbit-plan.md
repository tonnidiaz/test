
## NOTES
- **BYBIT** - Has high USDT withdraw fees
## COINS THAT WORK
- UMA-USDT
- HOT-USDT

## GOOD TO WITHDRAW

### OKX
- JOE, ONE, SC
### BYBIT
- ACA, CITY, ENJ, JUV, DCR, PSG, GNS, LUNC, SCRT, 

### OKX-BYBIT
- ENJ, BABYDOGE

### BITGET-OKX
- CETUS
## PLAN
- Init quote1 as balance
- Buy on plat1:
    - base1 +=, bal1 -=
- Withdraw from plat1:
    - base1 -= _base1
    - base2 += _base1 - fee

- Sell on plat2:
    - quote2 += , base2 -=;

- Withdraw from plat2:
    - quote2 -= _quote2
    - quote1 += _quote2 - fee