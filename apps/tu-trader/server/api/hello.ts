import { mMongoose } from "../plugins/mongo";

export default defineEventHandler(async(e)=>{
    console.log(mMongoose.models);
    return {msg: 'Hello'}
})