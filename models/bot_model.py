from bunnet import Document, PydanticObjectId
from typing import Literal

class Bot(Document):
    name: str = ""
    desc: str = ""
    active: bool = False
    demo: bool = True
    base: str = 'ETH'
    ccy: str = 'USDT'
    p_gain: float = 1/100
    sl_const: float = 30
    strict: bool = False
    demo: bool = True
    interval:int = 15
    category: str = 'spot'
    mult: float = 1.8
    ce_length: int = 1
    strategy: int = 1
    user: PydanticObjectId
    start_amt: float = 0
    curr_amt: float = 0
    orders: list[PydanticObjectId] = []
    platform: Literal['binance', 'bybit', 'okx'] = "okx"
    order_type: Literal['Market', 'Limit'] = 'Market'

    def __getitem__(self, key):
        return getattr(self, key)
    
    def __setitem__(self, key, val):
        return setattr(self, key, val)