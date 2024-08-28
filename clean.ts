import { Bot, Order } from "@/models"
import mongoose from "mongoose";

const DEV = true

async function connectMongo() {
    let mongoURL = (DEV ? process.env.MONGO_URL_LOCAL : process.env.MONGO_URL)!;
    try {
        console.log(mongoURL);
        await mongoose.connect(mongoURL, { dbName: "tb" }); 
        console.log("\nConnection established\n");
    } catch (e) {
        console.log("Could not establish connection");
        console.log(e);
    }
}

const remChildBots = async () =>{
    console.log("BEGIN CHILD BOTS...");
    const childBots = await Bot.find({is_child: true}).exec()
    
    for (let child of childBots){
        const bot = await Bot.findById(child.parent).exec()
        if (!bot || !bot.children.includes(child.id)){
            console.log("DELETING CHILD", child.name)
            await Bot.findByIdAndRemove(child.id).exec()
            console.log("CHILD REMOVED")
        }
    }
    console.log("CHILD BOTS DONE...");
}

const cleanOrders = async () =>{
    console.log("BEGIN ORDERS...");
    const orders = await Order.find().exec()
    console.log(orders.length)
    for (let ord of orders){
        const bot = await Bot.findById(ord.bot).exec()
        if (!bot || !bot.orders.includes(ord.id)){
            console.log("DELETING ORDER", ord.id)
            await Order.findByIdAndRemove(ord.id).exec()
            console.log("ORDER DELETED")
        }
    }
    console.log("ORDERS DONE")
}
const clean = async () =>{
    await connectMongo()
    await remChildBots()
    await cleanOrders()
}

clean()