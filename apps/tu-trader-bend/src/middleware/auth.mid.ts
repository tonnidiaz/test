import jwt from "jsonwebtoken";
import { NextFunction, Response, Request, RequestHandler } from "express";
import { User } from "@cmn/models";
import { IObj } from "@cmn/utils/interfaces";

const authMid: RequestHandler = async (req, res, next) => {
    await authenticator(req, res, next, true)
    return 
};
const lightAuthMid: RequestHandler = async (req, res, next) => {
    await authenticator(req, res, next, false)
    return 
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
    if (!req.user && isRequired) return res.status(401).send("tuned:Not authenticated!");
    next()
}

export { authMid, lightAuthMid };
