import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";

import indexRouter from "./routes/index";
import usersRouter from "./routes/users";

const app = express();
import { default as mongoose } from "mongoose";
import cors from "cors";
import { botJobSpecs, DEV } from "./utils/constants";
import dotenv from "dotenv";
import { Bee } from "./models";
import { scheduleJob } from "node-schedule";
import { beeJob } from "./utils/functions";

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

const init = async () => {
    try {
        console.log("INIT...");
        // Bee.watch().on("init", e=>{
        //     console.log("ON INIT", e)
        // }).on("error", e=>{
        //     console.log("ON ERROR", e) 
        // }).on("change", change=>{
        //     console.log({change});
        // }).on("close", e=>{
        //     console.log("ON INIT", e) 
        // })
        
        const activeBees = await Bee.find({ active: true }).exec();
        console.log({ activeBees: activeBees.length });

        for (let bee of activeBees) {
            const job = scheduleJob(bee.id, botJobSpecs(bee.interval), () =>
                beeJob(job, bee)
            );
        }
    } catch (err) {
        console.log(err);
    }
};
init();

export default app;
