import { IUser } from "@cmn/models/user";

export {};
declare global {
    namespace Express {
        interface Request {
            user: IUser | null;
        }
    }
}
