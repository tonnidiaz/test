import { Bot, Order, TriArbitOrder } from "@/models"
import { clearTerminal } from "@/utils/functions";
import { configDotenv } from "dotenv";
import mongoose from "mongoose";

const DEV = true
clearTerminal()
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
        if (!bot){
            console.log("DELETING ORDER", ord.id)
            await Order.findByIdAndDelete(ord.id).exec()
            console.log("ORDER DELETED")
        }
    }
    console.log("ORDERS DONE")
}

const cleanOldArbitOrders = async () =>{
    const bots = await Bot.find({type: 'arbitrage'}).exec()
    const {db} = mongoose.connection
    const bts = db.collection('bots')
    console.log(bts.collectionName)
    const rawBots = await bts.find().toArray()
    for (let bot of rawBots.filter(el=> el.type == 'arbitrage')){
        const ords : any[] = []
        for (let aord of bot.arbit_orders ?? []){
            const arbitOrd = new TriArbitOrder()
            arbitOrd.bot = bot._id
            
            if (aord.a){
                const {a,b,c} = aord
                const ordA = await Order.findById(a).exec()
                const ordB = await Order.findById(c).exec()
                const ordC = await Order.findById(b).exec()
                ordA?.set('is_arbit', true)
                ordB?.set('is_arbit', true)
                ordC?.set('is_arbit', true)
                await ordA?.save()
                await ordB?.save()
                await ordC?.save()
                console.log({a})
                arbitOrd.order = {a, b,c}
                await arbitOrd.save()
                ords.push(arbitOrd._id)
            }
            
            //console.log(arbitOrd.bot, '\n')
        }
        const _bot = await Bot.findById(bot._id).exec()
        if (!_bot) continue
        //_bot.arbit_orders = undefined
        await bts.findOneAndUpdate({_id: bot._id}, { $unset: { arbit_orders: true, orders: true} })
        await _bot.save()
        console.log({name: _bot.name}, 'DONE\n')
        //console.log({ords}, '\n')
    }

    return
 
    // for (let bot of bots){
    //     const arbitOrds :any[]= []
    //     console.log(bot.name)
    //     if (!bot.arbit_orders.length) continue
        
    //     console.log(bot.arbit_orders)
    //     for (let ord of bot.arbit_orders){
    //         if (!ord.a){
    //             ord = ord.toObject()
    //             console.log(ord[0])
    //          const arbOrd = {a: ord[0], b: ord[1], c: ord[2]}
    //             arbitOrds.push(arbOrd)
    //         }else{
    //             console.log({ord})
    //         }
    //     }
    //     console.log(arbitOrds, '\n')
    //   bot.arbit_orders = arbitOrds
    //  await bot.save()
    // }
}
const clean = async () =>{
    await connectMongo()
    await cleanOldArbitOrders()
    await remChildBots()
    await cleanOrders()
    console.log("DONE")
    return;
    
}

clean()

