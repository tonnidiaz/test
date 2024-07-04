from bunnet import Document, PydanticObjectId

class Bot(Document):
    name: str = ""
    desc: str = ""
    active: bool = True
    demo: bool = True
    use_swing_low: bool = True
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
    strategy: int = 5
    user: PydanticObjectId
    start_amt: float = 0
    curr_amt: float = 0
    orders: list[PydanticObjectId] = []