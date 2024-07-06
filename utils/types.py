from typing import TypedDict


class OrderData(TypedDict):
    id: str
    fill_time: int
    fill_sz: float
    fill_px: float
    fee: float