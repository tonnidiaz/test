from bunnet import Document, Indexed, PydanticObjectId


class Order(Document):
    order_id : str = ''
    buy_order_id: str = ''
    is_closed: bool = False
    buy_price : float = 0
    sell_price: float= 0
    profit: float= 0
    ccy_amt : float = 0
    base_amt : float = 0
    side: str = 'buy'
    buy_timestamp: str = ''
    sell_timestamp: str = ''
    buy_fee: float = 0
    sell_fee: float = 0
    base: str
    ccy: str
    bot: PydanticObjectId
    def __str__(self):
        return str({'order_id': self.order_id, 'is_closed': self.is_closed, 'side': self.side})