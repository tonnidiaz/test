import { botJobSpecs } from "@/utils/constants";
import { scheduleJob } from "node-schedule";

scheduleJob('m-job', botJobSpecs(5), ()=>{
    console.log(`HELLO @ ${new Date().toISOString()}`);
})