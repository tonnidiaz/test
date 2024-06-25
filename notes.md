# Notes

- Binance and Bybit return correct klines but not OKX
- The 10th candle has correct ha data

## Platforms comparison

- **BINANCE**
    - **PROS**
        - Can deposit and withdraw ZAR
        - R1 min ZAR deposit
        - USDC .12 Withhdrawal
    - **CONS**
        - Cannot demo trade
        - 1.4% ZAR deposit fee

- **Bybit**
    - **PROS**
        - Can demo trade
        - $.12 XRP Withdrawal fee
        - $.11 ETHW Withdrawal fee
        - FLR .1 (R .0407) Withdrawal fee
 
    - **CONS**
        - Cannot withdraw ZAR
        - Min ZAR deposit is 100
    
## Withdraw mech

- Convert assets to XRP
- Transfer to VALR
- Track status
- **On VALR**
    - Check XRP/ZAR price
    - Place trade to convert from XRP to ZAR
    - WIthdraw