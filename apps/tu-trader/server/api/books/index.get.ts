export default defineEventHandler(async(e)=>{
    try {
        const { count } = getQuery(e)
        console.log({count})
        tuFun
        const total = await TuBook.countDocuments();

    } catch (err) {
        return tunedErr(err, 500)
    }
})