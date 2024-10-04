import { config } from "dotenv";
import mongoose from "mongoose";

config()

export async function connectMongo(DEV = true, dbName = "tb") {
    console.log({ DEV });
    let mongoURL = (DEV ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL)!;
    try {
        console.log(mongoURL);
        const mn = await mongoose.connect(mongoURL, { dbName, family: 4 });
        console.log("\nConnection established\n");
        return mn
    } catch (e) {
        console.log("Could not establish connection");
        return console.log(e);
    }
}

