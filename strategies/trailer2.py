o, h, l, c = 0, 0, 0, 0
TRAIL = .5
SL = .5
TP = 3.5
px = 0
exit = 0
below_open = o * (1 - TRAIL/100)
below_high = h * (1 - TRAIL/100)

red_cond = px <= below_open and c < o and below_high < TP
red_cond2 = px <= below_open and c < o and below_high >= TP # PRICE REACHED TP FIRST
green_cond = px > below_open and c >= o and below_high >= TP
green_cond2 = px <= below_open and c >= o

if red_cond:
    exit = below_open
elif red_cond2:
    exit = below_high
elif green_cond2:
    exit = below_open
    entry = o
    exit = c or below_high