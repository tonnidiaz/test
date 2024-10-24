import {Router} from "express"

const router = Router()

router.get('/', (req, res)=>{
    res.send("Ohk")
})

export default router