import express from "express";
import { tunedErr } from "../utils/functions";
var router = express.Router();
import os from "os";
import { Bee } from "@/models";

/* GET home page. */
router.get("/", function (req, res, next) {
    console.log(os.arch());
    res.render("index", { title: "Express" });
});


router.post("/bee/create", async (req, res) => {
    try {
        const data = req.body;
        const bee = new Bee()
        for (let k of Object.keys(data)){
            const v = data[k]
            bee.set(k, v)
        }
        await bee.save()
        res.json(bee.toJSON())
    } catch (e) {
        console.log(e);
        res.status(500).send("swr");
    }
});
router.post("/bee/:id/edit", async (req, res) => {
    try {
        const data = req.body;
        const bee = await Bee.findById(req.params.id).exec()
        if (!bee) return tunedErr(res, 404, "BEE NOT FOUND")

        for (let k of Object.keys(data)){
            const v = data[k]
            bee.set(k, v)
        }
        await bee.save() 
        res.json(bee.toJSON())
    } catch (e) {
        console.log(e);
        res.status(500).send("swr");
    } 
}); 

router.get('/bee/:act', async (req, res)=>{
    const {act} = req.params
    const r = await Bee.updateMany({}, {active: act == 'activate' ? true: false}).exec()
    res.json("VEES UPDATED")
})

export default router;


