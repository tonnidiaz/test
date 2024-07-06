from typing import Optional
from bunnet import Document, Indexed, PydanticObjectId
from typing_extensions import TypedDict

class ITs(TypedDict):
    i: Optional[str] = ""
    o: Optional[str] = ""

class Order(Document):
    order_id : str = ''
    buy_order_id: str = ''
    cl_order_id: str = ''
    is_closed: bool = False
    buy_price : float = 0
    sell_price: float= 0
    profit: float= 0
    ccy_amt : float = 0
    new_ccy_amt: float = 0
    base_amt : float = 0
    side: str = 'buy'
    buy_timestamp: Optional[dict] = None
    sell_timestamp: Optional[dict] = None
    buy_fee: float = 0
    sell_fee: float = 0
    base: str
    ccy: str
    bot: PydanticObjectId
    def __str__(self):
        return str({'order_id': self.order_id, 'is_closed': self.is_closed, 'side': self.side})
    def __getitem__(self, key):
        return getattr(self, key)
    
    def __setitem__(self, key, val):
        return setattr(self, key, val)