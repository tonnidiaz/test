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
    IPlatform(name='okx', obj=TestOKX),]

platforms_lst = ['binance', 'bybit', 'okx']
date_format = "%Y-%m-%d %H:%M:%S%z"
TZ = "Africa/Johannesburg"