export default defineEventHandler(async (e) =>{
    try{
        console.log("\nAuthenti middleware!!...\n")
        e.context.user = {name: "Tonni"}
    }catch(e){
        console.log("Auth meddleware error!!", e)
    }
})