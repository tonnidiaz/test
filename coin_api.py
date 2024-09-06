import json
import requests
symbo = "BTC_USDT"
DEXE_START = "2024-03-05T14:00:00+02:00"
DEXE_END = "2024-03-05T17:00:00+02:00"
GFT_START = "2024-04-14T13:00:00+02:00"
GFT_END = "2024-04-14T15:00:00+02:00"

symbol_id = f"KUCOIN_SPOT_{symbo}"
klinesURL = f"https://rest.coinapi.io/v1/ohlcv/{symbol_id}/history"
order_book_URL = f"https://rest.coinapi.io/v1/orderbooks/{symbol_id}/history"

KEY0 = "5CFA6702-2C91-4F98-A45B-FAB3564E0A90"
KEY1 = "2851C217-28DF-4101-9B79-37A206346424"
KEY2 = "DC1A54FA-ECCC-40A8-A2FE-E094386A30F9"
KEY3 = "CDE0DA21-63A5-4AFA-B3BE-B93D6447EAFF"
KEY4 = "CDE0DA21-63A5-4AFA-B3BE-B93D6447EAFF"
headers = {
    "X-CoinAPI-Key": KEY2
}

params = {
    #"period_id": "15MIN",
     "limit": 100000,
     "limit_levels": 1,
    "time_end": DEXE_END,#"2024-04-14T15:00:00+02:00",#"2024-06-20T00:00:00",
    "time_start": DEXE_START#"2024-06-18T00:00:00",
}

def get_klines():
    res = requests.get(klinesURL, params=params, headers=headers)
    with open('data/coin-api/bybit-spot/klines.json', 'w') as f:
        
        json.dump(res.json(), f)
    print("DONE")

order_book_file = f"_data/coin-api/kucoin-spot/orderbook/{symbol_id}_{params['time_start'].split('T')[0]}_{params['time_end'].split('T')[0]}.json"
import os
def get_order_book():
    print("GETTING ORDERBOOK...")
    if (os.path.exists(order_book_file)):
        print("BOOK ALREADY EXISTS HOMMIE")
        #return 
    res = requests.get(order_book_URL, params=params, headers=headers)
    print("GOT IT")
    with open(order_book_file, 'w') as f:
        print(res.json())
        json.dump(res.json(), f)
    print("DONE")

def read_order_book():
    print('READING...')
    with open(order_book_file) as f:
        data = json.load(f)
        print(len(data[0]['asks']))
    print("DONE")

get_order_book()