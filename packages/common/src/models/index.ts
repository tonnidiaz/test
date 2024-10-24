import { InferSchemaType, Model, model, models } from "mongoose";
import { IUser, UserSchema } from "./user"
import { BotSchema, IBot, TriArbitOrderSchema } from "./bot";
import { IOrder, OrderSchema } from "./order";
import { TestSchema } from "./test";
import { TuBookSchema } from "./book";
import { TuConfigSchema } from "./config";
import { OTPSchema } from "./otp";

const User: Model<IUser> = models.User || model("User", UserSchema, )
const Bot: Model<IBot> = models.Bot || model("Bot", BotSchema, )
const TuOrder : Model<IOrder> = models.Order || model("Order", OrderSchema, )
export const TuBook = models.TuBook || model("TuBook", TuBookSchema, )
export const TuConfig = models.TuConfig ||model("TuConfig", TuConfigSchema, )
export const TriArbitOrder = models.TriArbitOrder || model("TriArbitOrder", TriArbitOrderSchema, )
const Test = models.Test || model("Test", TestSchema, )
export const OTP = models.OTP || model("OTP", OTPSchema)

export type TBot = typeof Bot
export { User, Bot, TuOrder, Test }


