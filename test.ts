import { parseDate } from "@/utils/funcs2";
import { randomNum } from "@/utils/functions";
import { scheduleJob } from "node-schedule";

function hello(){
    const klines = [1,2,3,4,5]
    const last = klines.pop()
    console.log({last, klines});
}
hello()