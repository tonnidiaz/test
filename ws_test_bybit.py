from pybit.unified_trading import WebSocket
from time import sleep
from os import getenv
import dotenv

dotenv.load_dotenv()

print(getenv("BYBIT_API_KEY_DEV"))

def on_kline(msg):
    print(msg)
try:
    ws = WebSocket('spot', demo = True, testnet = True, api_key = getenv("BYBIT_API_KEY_DEV"), api_secret = getenv("BYBIT_API_SECRET_DEV"))
    ws.kline_stream(5, 'SOLUSDT', on_kline)
except Exception as e:
    print(e)





while True:
    sleep(1)