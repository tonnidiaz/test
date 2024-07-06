from datetime import datetime
import pytz
from utils.consts import date_format
from utils.functions import parse_date

class P:
    name: str

    def __init__(self, name: str) -> None:
        self.name = name
        
    def say_hi(self):
        print('HELLO')

    
class M(P):
    pass
class D(P):
    pass

m = M('Tom')
d = D('David')

    

def main():
    pos = False
    print(pos)
    def fn():
        nonlocal pos
        pos = True
    
    fn()
    print(pos)

#print(datetime.strptime("2021-01-01 00:00:00+02:00", date_format))
print(parse_date(datetime.now()))