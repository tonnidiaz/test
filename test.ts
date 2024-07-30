import { parseDate } from "@/utils/funcs2";
import { randomNum } from "@/utils/functions";
import { scheduleJob } from "node-schedule";

function hello(){
    try{
    return console.log('HELLO');
}catch(e){
    console.log(e);
}finally{
    console.log("BYE");
}
}
hello()