import { User } from "@cmn/models";
import { __DEV__ } from "@cmn/utils/consts3";
import { connectMongo } from "@cmn/utils/funcs4";
import { clearTerminal, handleErrs } from "@cmn/utils/functions";
import { captureLogs } from "@cmn/utils/functions2";
import type { IObj } from "@cmn/utils/interfaces";
import { error, type Handle, type HandleServerError, type RequestEvent, type ResolveOptions } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { isObjectIdOrHexString } from "mongoose";
clearTerminal()
const fn = async () => {

    console.log("Run once!!"); 
    if (!__DEV__)
    captureLogs({appName: "tu-trader"})
    await connectMongo(__DEV__, __DEV__ ? "tb" : "tu-trader");
};
fn();

const protectedRoutes = ["auth/logi"];

async function authMed(event: RequestEvent, res: any) {
    const req = event.request
    const authorization = req.headers.get("authorization");
    const tkn = authorization?.split(" ")[1];
    if (!tkn || tkn == "null") {
        console.log("Unauthorized");
        return error(401, "Unautorized. Token missing!");
    } else {
        try {
            const { payload } = jwt.verify(
                tkn,
                process.env.SECRET_KEY!
            ) as IObj;
            if (payload?.id) {
                const user = await User.findById(payload.id).exec();
                console.log({user: user.username});
                event.locals.user = user
            }
        } catch (e) {
            console.log("JWT ERR:", e);
            return error(401, "Bad token");
        }
    }
    return res(event)
}
export const handle: Handle = async ({ resolve, event }) => {
    console.log("\nSERVER MIDDLEWARE\n");
    const req = event.request;

    const { pathname, searchParams } = event.url;
    const q = searchParams.get("q");
    const loginCond = pathname == "/api/auth/login" && q == "token"
    if (loginCond || (req.method.toLowerCase() == "post" && req.url.includes("/user") )) {
        return authMed(event, resolve);
    }

    return resolve(event);
};

export const handleError: HandleServerError = async ({
    error,
    event,
    status,
    message,
}) => {
    handleErrs(error);
    return { message: "tu:Something went wrong", status };
};

/*  */