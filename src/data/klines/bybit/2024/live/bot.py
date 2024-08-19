import os


def add_sub(sub = "demo"):
    for f in os.listdir():
        if f.endswith('.json') and sub not in f:
            os.rename(f, f.split('.')[0] + f'-{sub}.json')
    print("DONE")

def replace_sub(s1, s2):
    for f in os.listdir():
        if f.endswith('.json') and s1 in f:
            os.rename(f, f.replace(s1, s2))
    print("DONE")

replace_sub("demo", "live")