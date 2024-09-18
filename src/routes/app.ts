import express from "express";

import { TuConfig, User } from "../models/index";
import { IObj } from "@/utils/interfaces";
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
        for (let k of Object.keys(body)){
            const v = body[k]
            config?.set(k, v)
            
        }
        await config?.save()
        res.json(config?.toJSON());
    } catch (e) {
        console.log(e);
        res.status(500).json({ msg: "Something went wrong!" });
    }
});

export default router;
