import { botJobSpecs } from "@/utils/constants";
import { scheduleJob } from "node-schedule";
console.log('START');
scheduleJob('m-job', botJobSpecs(60), ()=>{
    console.log(`HELLO @ ${new Date().toISOString()}`);
})