import { Job, scheduleJob } from "node-schedule";
import { test_platforms } from "./consts";
import { pairsOfInterest } from "./consts3";
import { IOrderbook, TPlatName } from "./interfaces";
import { existsSync, readJson, timedLog, writeJson } from "./functions";
import { bookJobs, botJobSpecs } from "./constants";
import { TuBook, TuConfig } from "@/models";
import { configDotenv } from "dotenv";
import mongoose from "mongoose";

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
async function platBookFetcher(platName: string, pairs: string[][], job: Job) {
    const config = await TuConfig.findOne({}).exec();
    const plat = new test_platforms[platName as TPlatName]({ demo: false });
    if (plat && config?.fetch_orderbook_enabled) {
        timedLog(`[${platName}] GETTING BOOKS...`);
        pairs.forEach(async (pair, i) => {
            const bookDoc =
                (await TuBook.findOne({ pair, plat: platName }).exec()) ??
                new TuBook({ pair, plat: platName });
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
            if (i == pairs.length -1){timedLog(`[${platName}] BOOKS GOT!!\n`);}
        });
        
    } else {
        timedLog("KILLING JOB");
        job.cancel(false);
    }
}
export async function fetchAndStoreBooks() {
    const config = await TuConfig.findOne({}).exec();
    if (!config?.fetch_orderbook_enabled) return;
    timedLog("SCHEDULING BOOK FETCHER JOBS...");
    for (let platName of Object.keys(pairsOfInterest)) {
        let platPairs: string[][] = [];
        for (let pairs of pairsOfInterest[platName]) {
            const pairA = [pairs.B, pairs.A];
            for (let coinC of pairs.C) {
                const pairB = [coinC, pairs.B];
                const pairC = [coinC, pairs.A];
                platPairs.push(pairA, pairB, pairC);
            }
        }

        platPairs = Array.from(new Set(platPairs.sort()));
        const jobId = `${platName}__job`
        const jb = scheduleJob(jobId, botJobSpecs(config.book_fetch_interval), () => {
            platBookFetcher(platName, platPairs, jb);
        });

        bookJobs.push({job: jb, id: jobId, active: true})

        timedLog("BOOK FETCHER JOBS SCHEDULED!!");
    }
}
