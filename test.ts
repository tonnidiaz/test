import { chandelierExit, heikinAshi, parseKlines } from "@/utils/funcs2"
import { readJson } from "@/utils/functions"
import { writeFileSync } from "fs"

const fname= "src/data/klines/binance/SOL-USDT_15m_2024-05-02 00 00 00 GMT+2_2024-06-10 23 59 00 GMT+2.json"

function precision(a: number) {
    if (!isFinite(a)) return 0;
    var e = 1, p = 0;
    while (Math.round(a * e) / e !== a) { e *= 10; p++; }
    return p;
  }
function toFixed(num: number, dec: number){
    const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (dec || -1) + '})?');
    return Number(num.toString().match(re)![0])
}

var amt = 0.046
  console.log(toFixed(amt, precision(0.01)));