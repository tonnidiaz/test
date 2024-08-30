import { Bot, Order } from "@/models"
import { configDotenv } from "dotenv";
import mongoose from "mongoose";

const DEV = false
configDotenv()
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
            await Bot.findByIdAndDelete(child.id).exec()
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
            await Order.findByIdAndDelete(ord.id).exec()
            console.log("ORDER DELETED")
        }
    }
    console.log("ORDERS DONE")
}

const cleanOldArbitOrders = async () =>{
    const bots = await Bot.find({type: 'arbitrage'}).exec()
    for (let bot of bots){
        // const arbitOrds :any[]= []
        // console.log(bot.name)
        // if (!bot.arbit_orders.length) continue
        
        // //console.log(bot.arbit_orders)
        // for (let ord of bot.arbit_orders){
        //     if (!ord.a){
        //         ord = ord.toObject()
        //         console.log(ord[0])
        //      const arbOrd = {a: ord[0], b: ord[1], c: ord[2]}
        //         arbitOrds.push(arbOrd)
        //     }
        // }
        //console.log(arbitOrds, '\n')
      //bot.arbit_orders = arbitOrds
     await bot.save()
    }
}
const clean = async () =>{
    await connectMongo()
    await cleanOldArbitOrders()
    console.log("DONE")
    return;
    await remChildBots()
    await cleanOrders()
}

clean()

