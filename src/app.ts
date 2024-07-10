import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";

import indexRouter from "./routes/index";
import usersRouter from "./routes/users";
import authRouter from "./routes/auth";
import botsRouter from "./routes/bots";

const app = express();
import { default as mongoose } from "mongoose";
import cors from "cors";
import { DEV, setJobs } from "./utils/constants";
import dotenv from "dotenv";
import { Bot } from "./models";
import { addBotJob } from "./utils/orders/funcs";

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
    for (let bot of activeBots) {
        await addBotJob(bot);
    }
    //new MainOKX()
};

main();
export default app;
