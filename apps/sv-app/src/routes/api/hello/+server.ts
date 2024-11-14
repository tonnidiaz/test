import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({request})=>{
    return json({hello: "World"})
}
export const POST: RequestHandler = async ({request})=>{
    const {name} = await request.json()
    console.log({name})
    return json({hello: name || "John doe"})
}