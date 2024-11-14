import { timedLog } from "@cmn/utils/functions"
import type { RequestHandler } from "./$types"
import binanceApiNode from "binance-api-node"
import { platBookFetcher } from "@cmn/utils/funcs4"

export const GET: RequestHandler = ()=>{
    const fn = (binanceApiNode as any).default as typeof binanceApiNode
    const bin = fn()
    console.log(bin)
    return new Response("Hello from Books task")
}
export const POST: RequestHandler = async ({request})=>{
    const data = await request.json()
    timedLog("Book FETCHER")
    try{
        for (let obj of data){
            platBookFetcher(obj.platName, obj.pairs)
        }
    }
    catch(e){
        timedLog("BookFetcher failed", e)
    }
    return new Response("Hello from Books task")
}