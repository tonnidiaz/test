import { User } from "@cmn/models";
import { genToken, tunedErr } from "@cmn/utils/bend/functions";
import { isEmail } from "@cmn/utils/functions";
import type { RequestHandler } from "./$types";
import  bcrypt from 'bcrypt'
import { error, json } from "@sveltejs/kit";

export const POST: RequestHandler = async ({request: req, locals})=>{
    try {
        const { username, password } = await req.json();
        if (locals.user && !password) {
            return json({ user: { ...(locals.user).toJSON() } });
        } 
        else if (username && password) {
            const q = isEmail(username) ? { email: username } : { username };
            let user = await User.findOne(q).exec();
            if (user) {
                const passValid = bcrypt.compareSync(password, user.password);

                if (!passValid)
                    return error(400, "tuned:Incorrect password.");
                const token = genToken({ id: user._id });
                return json({ user: { ...user.toJSON() }, token });
            } else return error( 400, "tuned:Account does not exist");
        } else {
           return error(400, "tuned:Provide all fields");
        }
    } catch (e) {
        console.log(e);
        return error(500, "tuned:Something went wrong");
    }
}