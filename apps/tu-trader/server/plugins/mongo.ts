import mongoose from "mongoose";
import { connectMongo } from "~/src/tulib";
import { __DEV__ } from "~/utils/constants";

let mMongoose: typeof mongoose;
export default defineNitroPlugin(async nitroApp=>{
    console.log("Mongo Plugin")
    try {
        const mn = await connectMongo(__DEV__)
        if (!mn) return console.log('Failed to connect mongo');
        mMongoose = mn
        console.log('Mongo connected')
    } catch (e) {
        console.log("Failed to connect mongo")
        console.log(e)
    }
})  
export {mMongoose} 