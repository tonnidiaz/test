from dotenv import load_dotenv
from okx import MarketData, Account, Trade
from models.bot_model import Bot
from utils.constants import *
from utils.functions import err_handler
import json, os
from datetime import datetime

load_dotenv() 
klines = [] 

class OKX:

    ws_url = "wss://wspap.okx.com:8443/ws/v5/business?brokerId=9999" 
    ws_url_private = "wss://wspap.okx.com:8443/ws/v5/private?brokerId=9999"
    inst = None
    def __init__(self, bot: Bot) -> None:

        print("INITIALIZE OKX")
        print(os.getenv("OKX_PASSPHRASE"))
        self.bot = bot
        self.flag = "1" if self.bot.demo else "0"  # Production trading:0 , demo trading:1
        self.api_key = os.getenv("OKX_API_KEY_DEV" if self.bot.demo else "OKX_API_KEY")
        self.api_secret = os.getenv("OKX_API_SECRET_DEV" if self.bot.demo else "OKX_API_SECRET")
        self.passphrase = os.getenv('OKX_PASSPHRASE')
        api_key, api_secret, passphrase = self.api_key, self.api_secret, self.passphrase

        self.passphrase = os.getenv('OKX_PASSPHRASE')
        self.acc_api = Account.AccountAPI(api_key, api_secret, passphrase, False, self.flag)
        self.trade_api = Trade.TradeAPI(api_key, api_secret, passphrase, False, self.flag)
        self.market_data_api = MarketData.MarketAPI(flag=self.flag)

        
    def get_klines(self, end = None):
        """ Returns Reversed klines """
        klines = []
        print('GETTING OKX KLINES...')
        end = end if end else  round(datetime.now().timestamp() * 1000)
        res = self.market_data_api.get_index_candlesticks(instId=self.get_symbol(), bar=f"{self.bot.interval}m", after=end)
        data = res['data']
        klines = [*klines,*data]
        d =klines.copy()
        d.reverse()
        
        return d

    def get_bal(self, ccy):

        try:
            print("GETTING BALANCE...")
            res = self.acc_api.get_account_balance(ccy=ccy)
            bal = res["data"][0]["details"][0]["availBal"]
            return float(bal)

        except Exception as e:
            print('FAILED TO GET BALANCE')
            err_handler(e)

    def get_symbol(self):
        app = self.bot
        return f'{app.base}-{app.ccy}'
    
    def place_order(self, amt, tp = None, sl = None, side = 'buy', price = 0):
        try:
            print("PLACING ORDER...")

            #if side == 'buy':
            res = self.trade_api.place_order(instId=self.get_symbol(), tdMode='cash', ordType='market', side=side, sz = amt, px=price)

            """ else:
                res = self.trade_api.place_algo_order(
                    instId=self.get_symbol(), tdMode='cash', side=side, ordType='oco',
                    sz=amt,
                tpTriggerPx = tp, tpOrdPx = '-1', slTriggerPx =  sl, slOrdPx = '-1'
                ) """

            if res['code'] != '0':
                print(res)
                raise Exception('Failed to place order')
            
            print(f"{'OCO' if side == 'sell' else ''} ORDER PLACED SUCCESSFULLY!\n")
            data = res['data'][0]

            order_id =data['ordId']# if side =='buy' else data['algoId']
            return order_id

        except Exception as e:
            err_handler(e)
        
    def get_order_by_id(self, order_id = None, algo_order_id = None):
        
        try:
            print(f'GETTING ORDER {order_id}')
            res = self.trade_api.get_algo_order_details( algoId=algo_order_id) if algo_order_id else self.trade_api.get_order(instId=self.get_symbol(), ordId=order_id)
            status = res['code']
            if status == '0':
                return res['data'][0]
            
            else:
                print('Failed to get order on first try')
                print(res)

                if status == '51603':
                    # Order was not found
                    return self.get_order_by_id(order_id=algo_order_id)
        except Exception as e:
            err_handler(e)

#okx : OKX = None