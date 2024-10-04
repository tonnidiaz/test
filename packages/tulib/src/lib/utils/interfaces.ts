import { ObjectId } from "mongoose";
export interface IOpenBot {
    id: ObjectId;
    exitLimit: number;
    klines: any[][];
}
