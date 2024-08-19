import os

for f in os.listdir():
    if f.endswith('.json') and 'live' not in f:
        os.rename(f, f.split('.')[0] + '-live.json')