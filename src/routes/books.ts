import express from "express";

import { TuBook, TuConfig, User } from "../models/index";
const router = express.Router();
/* GET users listing. */
router.get("/", async function (req, res, next) {
    try {
        let {page, bot, limit, count} = req.query
        if (count) return res.json(await TuBook.countDocuments())
        const _limit = Number(limit) || 100
        const _page = Number(page) || 1
        const skip = (_page - 1) * _limit;
        const books = await TuBook.find().skip(skip).limit(_limit).exec();
        res.json(books?.map(el=> el.toJSON()));
    } catch (e) {
        console.log(e);
        res.status(500).json({ msg: "Something went wrong!" });
    }
});


export default router;