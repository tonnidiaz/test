import { connectMongo, TuBook } from "~/src/tulib"
import { nuxtErr } from "../utils/funcs"

export default defineEventHandler(async (e) =>{
    try {
        console.log({user: e.context.user})
        const books = 600
        return {hello: 'World!!', books}
    } catch (err) {
        return nuxtErr(err)
    }
})