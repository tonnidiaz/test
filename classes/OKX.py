from typing import Literal, Optional
from dotenv import load_dotenv
from okx import MarketData, Account, Trade
from models.bot_model import Bot
from utils.constants import *
import json, os
from datetime import datetime

from utils.types import OrderData

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
        self.flag = (
            "1" if self.bot.demo else "0"
        )  # Production trading:0 , demo trading:1
        self.api_key = os.getenv("OKX_API_KEY_DEV" if self.bot.demo else "OKX_API_KEY")
        self.api_secret = os.getenv(
            "OKX_API_SECRET_DEV" if self.bot.demo else "OKX_API_SECRET"
        )
        self.passphrase = os.getenv("OKX_PASSPHRASE")
        api_key, api_secret, passphrase = self.api_key, self.api_secret, self.passphrase

        self.passphrase = os.getenv("OKX_PASSPHRASE")
        self.acc_api = Account.AccountAPI(
            api_key, api_secret, passphrase, False, self.flag
        )
        self.trade_api = Trade.TradeAPI(
            api_key, api_secret, passphrase, False, self.flag
        )
        self.market_data_api = MarketData.MarketAPI(flag=self.flag)

    def get_klines(self, end=None):
        """Returns Reversed klines"""
        from utils.functions import get_interval

        klines = []
        print("GETTING OKX KLINES...")
        end = end if end else round(datetime.now().timestamp() * 1000)
        interval = self.bot.interval
        p = self.bot.platform
        res = self.market_data_api.get_candlesticks(
            instId=self.get_symbol(), bar=get_interval(interval, "okx"), after=str(int(end))
        )
        data = res["data"]
        klines = [*klines, *data]
        d = klines.copy()
        d.reverse()

        return d

    def get_bal(self, ccy):
        from utils.functions import err_handler

        try:
            print("GETTING BALANCE...")
            res = self.acc_api.get_account_balance(ccy=ccy)
            bal = res["data"][0]["details"][0]["availBal"]
            return float(bal)

        except Exception as e:
            print("FAILED TO GET BALANCE")
            err_handler(e)

    def get_symbol(self):
        app = self.bot
        return f"{app.base}-{app.ccy}"

    def place_order(
        self,
        amt: float,
        sl: float,
        price: float,
        cl_order_id: str,
        side: Literal["buy", "sell"] = "buy",
    ):
        try:
            from utils.functions import err_handler, bot_log
            from utils.funcs3 import fix_str
            
            od = {"price": price, "sl": sl, "amt": amt, "side": side}
            bot_log(self.bot, f"PLACING ORDER: {od}")
            cl_order_id = fix_str(cl_order_id)
            if side == "buy":
                res = self.trade_api.place_order(
                    instId=self.get_symbol(),
                    tdMode="cash",
                    ordType=self.bot.order_type.lower(),
                    side=side,
                    sz=amt,
                    px=str(price),
                    clOrdId=cl_order_id,
                )

            else:
                res = self.trade_api.place_algo_order(
                    instId=self.get_symbol(),
                    tdMode="cash",
                    side=side,
                    ordType="oco",
                    sz=amt,
                    tpTriggerPx=str(price),
                    tpOrdPx="-1",
                    slTriggerPx=str(sl),
                    slOrdPx="-1",
                    algoClOrdId=cl_order_id,
                )

            if res["code"] != "0":
                print(res)
                raise Exception("Failed to place order")

            print(f"{'OCO' if side == 'sell' else ''} ORDER PLACED SUCCESSFULLY!\n")
            data = res["data"][0]

            order_id = data["ordId"] if side == "buy" else data["algoId"]
            return order_id

        except Exception as e:
            err_handler(e)

    def get_order_by_id(self, order_id=None, is_algo=False):
        from utils.functions import err_handler, bot_log

        try:
            print(f"GETTING ORDER {order_id}")

            data: Optional[OrderData] = None
            res = (
                self.trade_api.get_algo_order_details(algoId=order_id)
                if is_algo
                else self.trade_api.get_order(instId=self.get_symbol(), ordId=order_id)
            )
            status = res["code"]
            if status == "0":
                d = res["data"][0]

                if is_algo and d["state"] == "effective":
                    return self.get_order_by_id(d["ordId"], is_algo=False)

                if not is_algo and d["state"] == "filled":
                    data = {
                        "id": d["ordId"],
                        "fill_px": float(d["avgPx"]),
                        "fill_sz": float(d["accFillSz"]),
                        "fee": float(d["fee"]),
                        "fill_time": float(d["fillTime"]),
                    }

                else:
                    bot_log(self.bot, "[OKX CLASS] ORDER NOT YET FILLED")
                    return "live"
                
                return data

        except Exception as e:
            err_handler(e)


# okx : OKX = None
