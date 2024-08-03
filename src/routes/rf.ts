import { Test } from "@/models";
import { Router } from "express";

const router = Router()

router.post('/model', async (req, res)=>{
    try{
let model = (await Test.find().exec())[0]
    if (!model){
        model = new Test({name: "Tonni"})
        await model.save()
    }

    model.cars.push({name: "Honda", speed: 357})
    await model.save()
    res.send('OK')
    }
    catch(e){
        console.log(e);
        res.status(500).json("FUCK")
    }

})

export default router

