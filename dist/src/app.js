"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = __importDefault(require("http-errors"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const index_1 = __importDefault(require("./routes/index"));
const users_1 = __importDefault(require("./routes/users"));
const auth_1 = __importDefault(require("./routes/auth"));
const bots_1 = __importDefault(require("./routes/bots"));
const rf_1 = __importDefault(require("./routes/rf"));
const app = (0, express_1.default)();
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const constants_1 = require("./utils/constants");
const dotenv_1 = __importDefault(require("dotenv"));
const models_1 = require("./models");
const funcs_1 = require("./utils/orders/funcs");
const functions_1 = require("./utils/functions");
dotenv_1.default.config();
// view engine setup
app.set("views", path_1.default.join(__dirname, "views"));
app.set("view engine", "pug");
app.use((0, cors_1.default)());
app.use((0, cors_1.default)({
    origin: "*",
}));
/*------------------ mongodb ----------------------- */
async function connectMongo() {
    let mongoURL = (constants_1.DEV ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL);
    try {
        console.log(mongoURL);
        await mongoose_1.default.connect(mongoURL, { dbName: "tb" });
        console.log("\nConnection established\n");
    }
    catch (e) {
        console.log("Could not establish connection");
        console.log(e);
    }
}
(async function () {
    await connectMongo();
})();
/*------------------ End mongodb ----------------------- */
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.use("/", index_1.default);
app.use("/users", users_1.default);
app.use("/auth", auth_1.default);
app.use("/bots", bots_1.default);
app.use("/rf", rf_1.default);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next((0, http_errors_1.default)(404));
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
    const activeBots = await models_1.Bot.find({ active: true }).exec();
    (0, constants_1.setJobs)([]);
    for (let bot of activeBots) {
        //const plat = bot.platform == 'bybit' ? wsBybit : wsOkx
        await (0, funcs_1.addBotJob)(bot);
        (0, functions_1.botLog)(bot, "INITIALIZING WS...");
        if (bot.orders.length) {
            const lastOrder = await models_1.Order.findById(bot.orders[bot.orders.length - 1]).exec();
            if (lastOrder &&
                lastOrder.side == "sell" &&
                !lastOrder.is_closed &&
                lastOrder.sell_price != 0) {
                //await plat.addBot(bot.id, true);
            }
        }
    }
};
main();
exports.default = app;
