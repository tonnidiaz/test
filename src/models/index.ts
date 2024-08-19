import { InferSchemaType, model } from "mongoose";
import { UserSchema } from "./user"
import { BotSchema } from "./bot";
import { OrderSchema } from "./order";
import { TestSchema } from "./test";

const User = model("User", UserSchema, )
const Bot = model("Bot", BotSchema, )
const Order = model("Order", OrderSchema, )
const Test = model("Test", TestSchema, )
export type TBot = typeof Bot
export { User, Bot, Order, Test }

const o = new Order()
