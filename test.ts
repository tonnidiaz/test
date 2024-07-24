import { parseDate } from "@/utils/funcs2";
import { randomNum } from "@/utils/functions";
import { scheduleJob } from "node-schedule";

(function(){
    if(console.log){
        var old = console.log;
        console.log = function(){
            Array.prototype.unshift.call(arguments, `[${parseDate(new Date())}]`);
            old.apply(this, arguments as any)
        }
    }  
})();

scheduleJob(new Date("2024-07-23 14:56:10"), ()=> console.log(randomNum(-7, 2)))
