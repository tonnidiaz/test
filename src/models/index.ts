import { InferSchemaType, model } from "mongoose";
import { UserSchema } from "./user"
import { BotSchema } from "./bot";
import { OrderSchema } from "./order";

const User = model("User", UserSchema, )
const Bot = model("Bot", BotSchema, )
const Order = model("Order", OrderSchema, )
export type TBot = typeof Bot
export { User, Bot, Order }

const o = new Order()
