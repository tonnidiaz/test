import { Job, scheduleJob } from "node-schedule";
import { test_platforms } from "./consts";
import { pairsOfInterest, taskManager } from "./consts3";
import { IOrderbook, TPlatName } from "./interfaces";
import { existsSync, readJson, timedLog, writeJson } from "./functions";
import { bookJobs, botJobSpecs, DEV } from "./constants";
import { TuBook, TuConfig } from "@/models";
import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import { ITuConfig } from "@/models/config";

configDotenv();
export async function connectMongo(DEV: boolean) {
    console.log({ DEV });
    let mongoURL = (DEV ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL)!;
    try {
        console.log(mongoURL);
        await mongoose.connect(mongoURL, { dbName: "tb" });
        console.log("\nConnection established\n");
    } catch (e) {
        console.log("Could not establish connection");
        console.log(e);
    }
}


export function addBooksTask(config: ITuConfig){
    timedLog("Adding books task...")
    taskManager.addTask({id: `task-books`, interval: config.book_fetch_interval, cb: fetchAndStoreBooks})
}
async function platBookFetcher(platName: string, pairs: string[][]) {
    const plat = new test_platforms[platName as TPlatName]({ demo: false });
    if (plat) {
        timedLog(`[${platName}] GETTING BOOKS...`);
        pairs.forEach(async (pair, i) => {
            const bookDoc = new TuBook({
                pair: pair.join("-"),
                plat: platName,
            });
            let book: IOrderbook[] = [];
            const savePath = `_data/ob/test/${platName}/${pair.join("-")}.json`;
            if (bookDoc.book) {
                book = bookDoc.book as any[];
            }
            const r = await plat.getBook(pair);
            if (r) {
                book.push(r);
                bookDoc.book = book;
                await bookDoc.save();
            }
            timedLog(`[${platName}] Book for ${pair} done!!`);
            if (i == pairs.length - 1) {
                timedLog(`[${platName}] BOOKS GOT!!\n`);
            }
        });
    } else {
        timedLog("KILLING JOB");
        //job.cancel(false);
    }
}
export async function fetchAndStoreBooks(taskId: string) {
    const config = await TuConfig.findOne({}).exec();
    if (!config?.fetch_orderbook_enabled) {
        taskManager.rmTask(taskId);
        return;
    }
    timedLog("SCHEDULING BOOK FETCHER JOBS...");
    for (let platName of Object.keys(pairsOfInterest)) {
        let platPairs: string[][] = [];
        for (let pairs of pairsOfInterest[platName]) {
            if (pairs.B) {
                /* TRI COINS */
                const pairA = [pairs.B, pairs.A];
                for (let coinC of pairs.C) {
                    const pairB = [coinC, pairs.B];
                    const pairC = [coinC, pairs.A];
                    platPairs.push(pairA, pairB, pairC);
                }
            } else {
                /* CROSS-COINS */
                for (let coinC of pairs.C) {
                    const pairC = [coinC, pairs.A];
                    platPairs.push(pairC);
                }
            }
        }

        platPairs = Array.from(new Set(platPairs.sort()));

        platBookFetcher(platName, platPairs);

        timedLog("BOOK FETCHER JOBS SCHEDULED!!");
    }
}

const globalJob = async () => {
    try {
        
        const now = new Date();
        const min = now.getMinutes();
        if (DEV) console.log({ min, tasks: taskManager.tasks });
        for (let task of taskManager.tasks) {
            if (min % task.interval == 0) {
                task.cb(task.id);
            }
        }
    } catch (err) {
        console.log(err);
    }
};

export async function scheduleAllTasks() {
    try {
        timedLog("Init global job...")
        scheduleJob(`job-${Date.now()}`, botJobSpecs(1), globalJob);
    } catch (err) {
        console.log("FAILED TO SCHEDULE ALL TASKS", err);
    }
}
