import mongoose from "mongoose";
import { __DEV__ } from "~/utils/constants";

const {MONGO_URL, MONGO_URL_LOCAL} = process.env

let mMongoose: typeof mongoose;
export default defineNitroPlugin(async nitroApp=>{
    console.log("Mongo Plugin")
    try {
        mMongoose = await mongoose.connect((__DEV__ ? MONGO_URL_LOCAL : MONGO_URL)!, {dbName: "tb"})
        console.log('Mongo connected')
    } catch (e) {
        console.log("Failed to connect mongo")
        console.log(e)
    }
})  
export {mMongoose} 