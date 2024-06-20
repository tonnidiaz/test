import json
klines = []
with open('logger.log') as f:
    for line in f.readlines():

        splitLine = line.strip().split("]: ")
        ohlc = json.loads(splitLine[-1])
        ts =   splitLine[0].replace('[', '')
        klines.append({"ts": ts, **ohlc})

with open('logger.json', 'w') as f:
    json.dump(klines, f)

print("DONE")