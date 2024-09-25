import express from 'express';

import { User } from "../models";
import { IObj } from '@/utils/interfaces';
const router = express.Router();
/* GET users listing. */
router.get('/', async function(req, res, next) {

    const { id } = req.query

    let users : IObj[]= []
    try{
    if (id){

        const user = await User.findById(id).exec()
        if (!user) return res.status(404).json({msg: "User not found"})
        users.push(user)
    }
    else {
        users = (await User.find().exec()).filter(it=> it.email_verified && it.first_name)
    }
  res.json({users: users.map(it=>it.toJSON())})}
  catch(e){
    console.log(e)
    res.status(500).json({msg: "Something went wrong!"})
  }
});

export default router;
