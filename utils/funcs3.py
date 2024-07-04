from utils.instrus import instruments, okx_instrus 
def precision(a: float):
    #if (!isFinite(a)) return 0;
    e = 1
    p = 0
    while (int(a * e) / e != a):
        e *= 10
        p+=1
    
    return p;

def get_coin_precision(pair: list[str],side = "sell",plat = "bybit"):
  
    is_bybit = plat == 'bybit'

    if is_bybit:
        instru = list(filter(lambda el: el['baseCoin'] == pair[0] and el['quoteCoin'] == pair[1], instruments))[0]
    else:
        instru = list(filter(lambda el: el['baseCcy'] == pair[0] and el['quoteCcy'] == pair[1], okx_instrus))[0]

    if (not instru): return 0
    if side == 'buy':
        pr = instru['quotePrecision' if is_bybit else 'tickSz']
    else:
        pr = instru['basePrecision' if is_bybit else 'lotSz']

    return precision(float(pr));

def get_price_precision(pair: list[str], plat: str = 'bybit'):

    is_bybit = plat == 'bybit'
    if is_bybit:
        instru = list(filter(lambda el: el['baseCoin'] == pair[0] and el['quoteCoin'] == pair[1], instruments))[0]
    else:
        instru = list(filter(lambda el: el['baseCcy'] == pair[0] and el['quoteCcy'] == pair[1], okx_instrus))[0]

    if (not instru): return 0
    return precision(
        float(instru["minPricePrecision" if is_bybit else "tickSz"])
    )
