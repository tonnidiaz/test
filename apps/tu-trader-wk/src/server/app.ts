import { DEV, setJobs } from "@cmn/utils/constants";
import {
    addBooksTask,
    connectMongo,
    scheduleAllTasks,
} from "@cmn/utils/funcs4";
import cookieParser from "cookie-parser";
import express from "express";
export const app = express();
import cors from "cors";
import logger from "morgan";
import { TuArbitWs } from "@cmn/classes/tu";
import {
    initArbitWs,
    triArbitWsList,
    crossArbitWsList,
} from "@cmn/classes/tu-ws";
import { Bot, TuConfig } from "@cmn/models";
import { botLog } from "@cmn/utils/bend/functions";
import { captureLogs } from "@cmn/utils/functions2";
import createError from "http-errors";

import indexRouter from "@/routes";
import botsRouter, { toggleMegaBot } from "@/routes/bots";
import { clearTerminal } from "@cmn/utils/functions";
import path from "node:path";
import { _dirname } from "..";

clearTerminal();
console.log({ _dirname });
app.set("views", path.join(_dirname, "views"));
app.set("view engine", "pug");
app.use(cors());
app.use(
    cors({
        origin: "*",
    })
);
app.use(
    logger("dev", {
        skip(req) {
            if (req.url.includes("socket.io")) return true;
            else false;
        },
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/hello", (_, res) => {
    res.send("Hello Vite + TypeScript!");
});

app.use("/", indexRouter);
app.use("/bots", botsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    // if (!req.url.includes('socket.io'))
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

const main = async () => {
    // CREATE CONFIG IF NONE
    // if (DEV) return

    const activeBots = await Bot.find({ active: true }).exec();
    setJobs([]);
    await initArbitWs();

    if (!DEV)
        for (let bot of activeBots) {
            const triWs: TuArbitWs = triArbitWsList[bot.platform];
            const crossWs: TuArbitWs = crossArbitWsList[bot.platform];
            if (bot.type == "arbitrage" && bot.arbit_settings.super_mega) {
                botLog(bot, "Activating super-mega bot...");
                await toggleMegaBot(bot, "activate");
            }

            // if (bot.type == 'arbitrage' ){
            //     botLog(bot, "INITIALIZING WS...");
            //     addBotToArbitWs(bot)
            // }else{
            //      await addBotJob(bot);
            // }

            // if (bot.orders.length) {
            //     const lastOrder = await Order.findById(
            //         bot.orders[bot.orders.length - 1]
            //     ).exec();
            //     if (
            //         lastOrder &&
            //         lastOrder.side == "sell" &&
            //         !lastOrder.is_closed &&
            //         lastOrder.sell_price != 0
            //     ) {
            //         //await plat.addBot(bot.id, true);
            //     }
            // }
        }
};

const init = async () => {
    try {
        if (!DEV) captureLogs({ appName: "tu-trader-worker" });
        console.log("WORKER");
        await connectMongo(DEV, DEV ? "tb" : "tu-trader");
        const config = (await TuConfig.findOne({}).exec()) || new TuConfig();
        await config.save();
        // const r = await localApi().post('/tasks/books', {books: [1,2,3,4]})
        // console.log(r.data)
        // return
        // if (DEV) return;
        await scheduleAllTasks();
        if (config.fetch_orderbook_enabled) addBooksTask(config);

        main();
    } catch (e) {
        console.log("Init error", e);
    }
};

init();
