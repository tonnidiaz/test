import mn, { InferSchemaType, Model, model } from "mongoose";
import { IUser, UserSchema } from "./user"
import { BotSchema, IBot, TriArbitOrderSchema } from "./bot";
import { IOrder, OrderSchema } from "./order";
import { TestSchema } from "./test";
import { TuBookSchema } from "./book";
import { TuConfigSchema } from "./config";
import { OTPSchema } from "./otp";

const User: Model<IUser> = mn.models.User || model("User", UserSchema, )
const Bot: Model<IBot> = mn.models.Bot || model("Bot", BotSchema, )
const TuOrder : Model<IOrder> = mn.models.Order || model("Order", OrderSchema, )
export const TuBook = mn.models.TuBook || model("TuBook", TuBookSchema, )
export const TuConfig = mn.models.TuConfig ||model("TuConfig", TuConfigSchema, )
export const TriArbitOrder = mn.models.TriArbitOrder || model("TriArbitOrder", TriArbitOrderSchema, )
const Test = mn.models.Test || model("Test", TestSchema, )
export const OTP = mn.models.OTP || model("OTP", OTPSchema)

export type TBot = typeof Bot
export { User, Bot, TuOrder, Test }


