import { parseDate } from "@/utils/funcs2";
import { randomNum } from "@/utils/functions";

(function(){
    if(console.log){
        var old = console.log;
        console.log = function(){
            Array.prototype.unshift.call(arguments, `[${parseDate(new Date())}]`);
            old.apply(this, arguments as any)
        }
    }  
})();

console.log(randomNum(-7, 2))