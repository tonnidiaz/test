import jwt from "jsonwebtoken";
import { NextFunction, Response, Request } from "express";
import { User } from "@cmn/models";
import { IObj } from "@cmn/utils/interfaces";

const authMid = async (req: Request, res: Response, next: NextFunction) => {
    return await authenticator(req, res, next, true)
};
const lightAuthMid = async (req: Request, res: Response, next: NextFunction) => {
    return await authenticator(req, res, next, false)
}; 
 
const authenticator = async (req : Request, res: Response, next: NextFunction, isRequired: boolean)=>{
    const { authorization } = req.headers;
    if (authorization) {
        const tkn = authorization.split(" ")[1];      
     if (tkn){
         try {
            const {payload} = jwt.verify(tkn, process.env.SECRET_KEY!) as IObj;
            if (payload?.id){
                const user =  await User.findById(payload.id).exec()
                    req.user = user
            }
        } catch (e) {
            console.log(e)
        }
      }
       
    } else {
        console.log("Not authenticated")
    }
    if (!req.user && isRequired) {res.status(401).send("tu:Not authenticated!"); return}
    next()
}

export { authMid, lightAuthMid };
