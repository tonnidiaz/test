import { DepInfo, User } from '@cmn/models';
import { handleErrs } from '@cmn/utils/functions'
import { error, json } from '@sveltejs/kit'

export const GET = async ({request: req, params}) =>{
    try {
        const {username} = params;
        const user = await User.findOne({username}).exec()
        if (!user) return error(404, "User not found")
        const addresses = await DepInfo.find({user: user.id}).exec()
        return json(addresses.map( addr=> addr.toJSON()).toReversed())
    } catch (err) {
        handleErrs(err)
        error(500, "Something went wrong")
    }
}