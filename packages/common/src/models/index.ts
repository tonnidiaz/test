import { InferSchemaType, model } from "mongoose";
import { UserSchema } from "./user"
import { BotSchema, TriArbitOrderSchema } from "./bot";
import { OrderSchema } from "./order";
import { TestSchema } from "./test";
import { TuBookSchema } from "./book";
import { TuConfigSchema } from "./config";

const User = model("User", UserSchema, )
const Bot = model("Bot", BotSchema, )
const TuOrder = model("Order", OrderSchema, )
export const TuBook = model("TuBook", TuBookSchema, )
export const TuConfig = model("TuConfig", TuConfigSchema, )
export const TriArbitOrder = model("TriArbitOrder", TriArbitOrderSchema, )
const Test = model("Test", TestSchema, )
export type TBot = typeof Bot
export { User, Bot, TuOrder, Test }
