/* const ddNum = (e: any) => {
    e = `${e}`.trim();
    return e.length == 1 ? `0${e}` : e;
};
const toISOString = (date: string) => {
    let dateArr = date.split(",");
    let time = dateArr[1];
    time = time
        .split(":")
        .map((el) => ddNum(el))
        .join(":");
    dateArr = dateArr[0].split("/");
    date = `${dateArr[0]}-${ddNum(dateArr[1])}-${ddNum(dateArr[2])}`;
    return `${date} ${time}+02:00`;
};
const parseDate = (date: Date | string) =>
    toISOString(
        new Date(date).toLocaleString("en-ZA", {
            timeZone: "Africa/Johannesburg",
        })
    );
(function(){
    if(console.log){
        var old = console.log;
        console.log = function(){
            Array.prototype.unshift.call(arguments, `[${parseDate(new Date())}]`);
            old.apply(this, arguments as any)
        }
    }  
})(); */

import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";

import indexRouter from "./routes/index";
import usersRouter from "./routes/users";
import authRouter from "./routes/auth";
import botsRouter from "./routes/bots";
import rfRouter from "./routes/rf";

const app = express();
import { default as mongoose } from "mongoose";
import cors from "cors";
import { DEV, setJobs } from "./utils/constants";
import dotenv from "dotenv";
import { Bot, Order } from "./models";
import { addBotJob } from "./utils/orders/funcs";
//import { wsOkx } from "./classes/main-okx";
import { botLog } from "./utils/functions";
import { wsOkx } from "./classes/main-okx";
import { wsBybit } from "./classes/main-bybit";
import { platforms } from "./utils/consts";
import { Bybit } from "./classes/bybit";
import { OKX } from "./classes/okx";
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

dotenv.config();
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(cors());
app.use(
    cors({
        origin: "*",
    })
);
/*------------------ mongodb ----------------------- */
async function connectMongo() {
    let mongoURL = (DEV ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL)!;
    try {
        console.log(mongoURL);
        mongoose.plugin(updateIfCurrentPlugin)
        console.log("UPDATE IF CURRENT PLUGIN SET")
        await mongoose.connect(mongoURL, { dbName: "tb" });
        console.log("Connection established");
    } catch (e) {
        console.log("Could not establish connection");
        console.log(e);
    }
}
(async function () {
    await connectMongo();
})();
/*------------------ End mongodb ----------------------- */
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/auth", authRouter);
app.use("/bots", botsRouter);
app.use("/rf", rfRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

/* import schedule, {Job} from "node-schedule"

let cnt = 0
const jobs : {job: Job, id: string}[] = []

const job = schedule.scheduleJob("* * * * * *", function(){
  console.log(`Hello world: ${cnt}`);
  if (cnt >= 5){
    const jb = jobs.find(e=>e.id == "1")?.job
    jb?.cancel()
    console.log("Job cancelled");
    setTimeout(()=>{
        cnt = 0
        jb?.reschedule("* * * * * *")
    }, 2000)
  }
  cnt ++
});

jobs.push({job, id: "1"}) */

const main = async () => {
    const activeBots = await Bot.find({ active: true }).exec();
    setJobs([]);
    console.log(wsBybit.TAG);
    for (let bot of activeBots) {
        const plat = bot.platform == 'bybit' ? wsBybit : wsOkx
        await addBotJob(bot);
        botLog(bot, "INITIALIZING WS...");
    
             if (bot.orders.length) {
            const lastOrder = await Order.findById(
                bot.orders[bot.orders.length - 1 ]
            ).exec();
            if (
                lastOrder &&
                lastOrder.side == "sell" &&
                !lastOrder.is_closed &&
                lastOrder.sell_price != 0
            ) {
                await plat.addBot(bot.id, true);
                
            }
        }  
        
      
    }
};

main();
export default app;
