import json
import requests

symbol_id = "BYBITSPOT_SPOT_SOL_USDT"
klinesURL = f"https://rest.coinapi.io/v1/ohlcv/{symbol_id}/history"
order_book_URL = f"https://rest.coinapi.io/v1/orderbooks/{symbol_id}/history"
headers = {
    "X-CoinAPI-Key": "5CFA6702-2C91-4F98-A45B-FAB3564E0A90"#"2851C217-28DF-4101-9B79-37A206346424"#"DC1A54FA-ECCC-40A8-A2FE-E094386A30F9"#"CDE0DA21-63A5-4AFA-B3BE-B93D6447EAFF"
}

params = {
    #"period_id": "15MIN",
     "limit": 100000,
    "time_end": "2024-06-20T00:00:00",
    "time_start": "2024-06-18T00:00:00",
}

def get_klines():
    res = requests.get(klinesURL, params=params, headers=headers)
    with open('data/coin-api/bybit-spot/klines.json', 'w') as f:
        
        json.dump(res.json(), f)
    print("DONE")

order_book_file = f"data/coin-api/bybit-spot/orderbook/{symbol_id}_{params['time_start'].split('T')[0]}_{params['time_end'].split('T')[0]}.json"

def get_order_book():
    return
    res = requests.get(order_book_URL, params=params, headers=headers)
    with open(order_book_file, 'w') as f:
        
        json.dump(res.json(), f)
    print("DONE")

def read_order_book():
    print('READING...')
    with open(order_book_file) as f:
        data = json.load(f)
        print(len(data[0]['asks']))
    print("DONE")

data = 