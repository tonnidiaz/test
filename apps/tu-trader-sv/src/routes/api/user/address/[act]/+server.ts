import { DepInfo, User } from '@cmn/models';
import { handleErrs } from '@cmn/utils/functions';
import { error, json } from '@sveltejs/kit';

export const POST = async ({request, params, locals}) =>{


    try{
         const body = await request.json()
    const {act} = params
    const user = locals.user!
// console.log({body});
    if (act == "add"){
        console.log("Adding new deposit address...");
        const addr = new DepInfo({...body})
        // console.log(user);
        addr.user = user.id ?? (await User.findById(user._id).exec()).id
        await addr.save();
        return json(addr.toJSON())
    }else{
        return json(act)
    }
    }catch(err){
        handleErrs(err)
        return error(500, "Error adding deposit address")
    }
   
}