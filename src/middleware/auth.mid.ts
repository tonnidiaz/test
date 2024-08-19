import jwt from "jsonwebtoken";
import { User } from "../models";
import { NextFunction, Response, Request } from "express";
import { IObj } from "@/utils/interfaces";

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
    if (!req.user && isRequired) return res.status(401).send("tuned:Not authenticated!");
    next()
}

export { authMid, lightAuthMid };
