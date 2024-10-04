import { connectMongo, TuBook } from "~/src/tulib"

export default defineEventHandler(async (e) =>{
    try {
        await connectMongo(true)
        const books = await TuBook.countDocuments()
        return {hello: 'World', books}
    } catch (err) {
        
    }
})