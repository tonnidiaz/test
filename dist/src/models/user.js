"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = void 0;
const mongoose_1 = require("mongoose");
const enums_1 = require("@/utils/enums");
const UserSchema = new mongoose_1.Schema({
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
        default: enums_1.UserPermissions.read,
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
    bots: { type: [mongoose_1.Schema.ObjectId], ref: "Bot" }
}, { timestamps: true });
exports.UserSchema = UserSchema;
