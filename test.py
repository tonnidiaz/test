from datetime import datetime
import pytz

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

def date_parse(date: str):
    gmt = date.split(' ')[-1]
    date = date.replace(gmt, '').strip()
    # Parse the date string with PM/AM and GMT+2 timezone
    dt_obj = datetime.strptime(date, "%Y-%m-%d %I:%M:%S %p")  # Adjust format as needed
    
    # Convert to GMT+2 timezone
    tz = pytz.timezone('Etc/GMT-2')
    dt_obj = tz.localize(dt_obj)
    
    # Convert datetime object to Unix timestamp
    timestamp = int(dt_obj.timestamp() * 1000)
    return timestamp
    

def main():
    pos = False
    print(pos)
    def fn():
        nonlocal pos
        pos = True
    
    fn()
    print(pos)

main()