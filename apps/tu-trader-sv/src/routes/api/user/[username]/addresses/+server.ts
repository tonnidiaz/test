import { tuErr } from '@/lib/server/funcs.js';
import { DepInfo, User } from '@cmn/models';
import { json } from '@sveltejs/kit'

export const GET = async ({request: req, params}) =>{
        const {username} = params;
        const user = await User.findOne({username}).exec()
        if (!user) return tuErr(404, "User not found")
        const addresses = await DepInfo.find({user: user.id}).exec()
        return json(addresses.map( addr=> addr.toJSON()).toReversed())
   
}