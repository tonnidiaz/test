from classes.test_bin import TestBinance
from classes.test_platforms import Platform, TestBybit, TestOKX


class IPlatform:
    name: str
    obj: Platform

    def __init__(self, name: str, obj: Platform) -> None:
        self.name = name
        self.obj = obj


platforms: list[IPlatform] = [
    IPlatform(name='binance', obj=TestBinance),
    IPlatform(name='bybit', obj=TestBybit),
    IPlatform(name='okx', obj=TestOKX),
]