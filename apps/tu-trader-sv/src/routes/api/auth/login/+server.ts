import { User } from "@cmn/models";
import { genToken, tunedErr } from "@cmn/utils/bend/functions";
import { isEmail } from "@cmn/utils/functions";
import type { RequestHandler } from "./$types";
import  bcrypt from 'bcrypt'
import { json } from "@sveltejs/kit";
import { tuErr } from "@/lib/server/funcs";

export const POST: RequestHandler = async ({request: req, locals})=>{
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
                    return tuErr(400, "Incorrect password.");
                const token = genToken({ id: user._id });
                return json({ user: { ...user.toJSON() }, token });
            } else return tuErr( 400, "Account does not exist");
        } else {
           return tuErr(400, "Provide all fields");
        }
    
}