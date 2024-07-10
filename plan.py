# curr_cundle = prev_candle in real_mode
#Check curr candle for signal

o = 1
h = 2
l = -5
c = 2

sl = 3
tp = 10

if o <= sl:
    exit = o

elif o > sl and l <= sl:
    exit  = sl

elif o >= tp:
    exit  = o
elif o < tp and h >= tp:
    exit = tp