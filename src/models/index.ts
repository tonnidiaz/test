import { InferSchemaType, model } from "mongoose";
import { UserSchema } from "./user"
import { BeeSchema } from "./bee";

export const User = model("User", UserSchema, )
export const Bee = model("Bee", BeeSchema, )

