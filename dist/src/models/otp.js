"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP = exports.OTPSchema = void 0;
const mongoose_1 = require("mongoose");
const OTPSchema = new mongoose_1.Schema({
    phone: {
        type: String,
        unique: true
    },
    email: {
        type: String,
        unique: true
    },
    pin: {
        type: Number,
        required: true
    }
}, { timestamps: true });
exports.OTPSchema = OTPSchema;
const OTP = (0, mongoose_1.model)("OTP", OTPSchema);
exports.OTP = OTP;
