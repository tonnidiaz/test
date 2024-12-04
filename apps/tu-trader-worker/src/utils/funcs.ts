import { Response } from "express";
export const tunedErr = (res: Response, status: number, msg: string, e?: any) => {
    if (e) {
        console.log(e);
    }
     res.status(status).send(`tuned:${msg}`);
};