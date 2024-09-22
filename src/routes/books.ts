import express from "express";

import { TuBook, TuConfig, User } from "../models/index";
const router = express.Router();
/* GET users listing. */
router.get("/", async function (req, res, next) {
    try {
        let { page, bot, limit, count } = req.query;
        const total = await TuBook.countDocuments();
        const plats: {
            name: string;
            pairs: string[][];
        }[] = [];
        const allBooks = await TuBook.find().exec()
        const availPlats= Array.from(new Set(allBooks.map(el=>el.plat)))
        for (let plat of availPlats){
            plats.push({name: plat, pairs: allBooks.filter(el=> el.plat == plat).map(el=> el.pair.split('-'))})
        }
        return res.json({ total, plats });
    } catch (e) {
        console.log(e);
        res.status(500).json({ msg: "Something went wrong!" });
    }
});
router.get("/:platform", async function (req, res, next) {
    try {
        let { page, bot, limit, pair } = req.query;
        const { platform } = req.params;

        const _limit = Number(limit) || 100;
        const _page = Number(page) || 1;
        const skip = (_page - 1) * _limit;
        console.log({ pair });
        const _pair = (pair as string)
        console.log({ _pair });
        const books = await TuBook.find({ plat: platform, pair: _pair })
            .skip(skip)
            .limit(_limit)
            .exec();
        res.json(books?.map((el) => el.toJSON()));
    } catch (e) {
        console.log(e);
        res.status(500).json({ msg: "Something went wrong!" });
    }
});

export default router;
