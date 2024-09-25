import express from "express";

import { TuConfig, User } from "../models/index";
import { IObj } from "@/utils/interfaces";
import { bookJobs, botJobSpecs } from "@/utils/constants";
import { addBooksTask, fetchAndStoreBooks } from "@/utils/funcs4";
import { taskManager } from "@/utils/consts3";
const router = express.Router();
/* GET users listing. */
router.get("/config", async function (req, res, next) {
    try {
        const config = await TuConfig.findOne({}).exec();
        res.json(config?.toJSON());
    } catch (e) {
        console.log(e);
        res.status(500).json({ msg: "Something went wrong!" });
    }
});
router.post("/config", async function (req, res, next) {
    try {
        const body = req.body;
        const config = await TuConfig.findOne({}).exec();
        const oldInterval = config?.book_fetch_interval;

        const booksTask = taskManager.tasks.find(el=> el.id == 'task-books')
        if (oldInterval != body.book_fetch_interval) {
            console.log("CANCELLING OLD BOOK JOBS");
            taskManager.rmTask(booksTask?.id)
        }

        for (let k of Object.keys(body)) {
            const v = body[k];
            config?.set(k, v);
        }
        await config?.save();
        if (config?.fetch_orderbook_enabled) {
            console.log("RESCHEDULING BOOK JOBS");
            addBooksTask(config)
        } else {
            console.log("CANCELLING BOOK JOBS");
            taskManager.rmTask('task-books')
        }
        res.json(config?.toJSON());
    } catch (e) {
        console.log(e);
        res.status(500).json({ msg: "Something went wrong!" });
    }
});

export default router;
