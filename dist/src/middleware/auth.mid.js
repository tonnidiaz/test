"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lightAuthMid = exports.authMid = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const authMid = async (req, res, next) => {
    return await authenticator(req, res, next, true);
};
exports.authMid = authMid;
const lightAuthMid = async (req, res, next) => {
    return await authenticator(req, res, next, false);
};
exports.lightAuthMid = lightAuthMid;
const authenticator = async (req, res, next, isRequired) => {
    const { authorization } = req.headers;
    if (authorization) {
        const tkn = authorization.split(" ")[1];
        if (tkn) {
            try {
                const { payload } = jsonwebtoken_1.default.verify(tkn, process.env.SECRET_KEY);
                if (payload?.id) {
                    const user = await models_1.User.findById(payload.id).exec();
                    req.user = user;
                }
            }
            catch (e) {
                console.log(e);
            }
        }
    }
    else {
        console.log("Not authenticated");
    }
    if (!req.user && isRequired)
        return res.status(401).send("tuned:Not authenticated!");
    next();
};
//# sourceMappingURL=auth.mid.js.map