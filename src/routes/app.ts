import express from "express";

import { TuConfig, User } from "../models/index";
import { IObj } from "@/utils/interfaces";
import { bookJobs, botJobSpecs } from "@/utils/constants";
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
        const body = req.body
        const config = await TuConfig.findOne({}).exec();
        const oldInterval = config?.book_fetch_interval;
        if (oldInterval != body.book_fetch_interval){
            console.log("CANCELLING OLD BOOK JOBS")
            for (let job of bookJobs){
                job.job.cancel()
            }
        }

        for (let k of Object.keys(body)){
            const v = body[k]
            config?.set(k, v)
            
        }
        await config?.save()
        if (config?.fetch_orderbook_enabled){
            if (oldInterval != body.book_fetch_interval){
                console.log("RESCHEDULING BOOK JOBS")
                for (let job of bookJobs){
                    job.job.reschedule(botJobSpecs(config.book_fetch_interval))
                }
            }
        }else{
            if (oldInterval != body.book_fetch_interval){
                console.log("CANCELLING BOOK JOBS")
                for (let job of bookJobs){
                    job.job.cancel()
                }
            }
        }
        res.json(config?.toJSON());
    } catch (e) {
        console.log(e);
        res.status(500).json({ msg: "Something went wrong!" });
    }
});

export default router;
