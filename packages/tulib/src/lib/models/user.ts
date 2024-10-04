import { Schema, type InferSchemaType, Document } from "mongoose";
import { UserPermissions } from "../utils/enums";

const UserSchema = new Schema(
    {
        first_name: {
            type: String,
        },

        last_name: {
            type: String,
        },
        otp: { type: Number },
        username: { type: String, unique: true, required: true },
        email_verified: {
            type: Boolean,
            default: false,
        },
        new_email_verified: {
            type: Boolean,
            default: false,
        },
        permissions: {
            type: Number,
            default: UserPermissions.read,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        new_email: {
            type: String,
        },
        password: {
            type: String,
            required: true,
        },
        bots: {type: [Schema.ObjectId], ref: "Bot"}
    },
    { timestamps: true }
);

export interface IUser extends Document, InferSchemaType<typeof UserSchema> {}
export { UserSchema };
