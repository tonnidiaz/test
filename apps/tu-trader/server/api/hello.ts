import { connectMongo, TuBook } from "~/src/tulib"
import { nuxtErr } from "../utils/funcs"

export default defineEventHandler(async (e) =>{
    try {
        const books = await TuBook.countDocuments()
        return {hello: 'World', books}
    } catch (err) {
        return nuxtErr(err)
    }
})