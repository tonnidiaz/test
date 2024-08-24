"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const models_1 = require("../../models");
const functions_1 = require("../../utils/functions");
const otp_1 = __importDefault(require("./otp"));
const password_1 = __importDefault(require("./password"));
const auth_mid_1 = require("@/middleware/auth.mid");
const enums_1 = require("@/utils/enums");
const constants_1 = require("@/utils/constants");
const importantEmails = [
    "tonnidiazed@gmail.com",
    "clickbait4587@gmail.com",
    "openbytes@yahoo.com",
    "nyandenilebohang@gmail.com",
    "squashetonics@gmail.com",
];
const router = express_1.default.Router();
router.post("/signup", async (req, res) => {
    try {
        const { body, query } = req;
        if (query.act == "complete") {
            const user = await models_1.User.findOne({ email: body.email }).exec();
            for (let k of Object.keys(body)) {
                if (k != "password") {
                    user.set(k, body[k]);
                }
            }
            await user.save();
            const token = (0, functions_1.genToken)({ id: user._id });
            return res.json({ token });
        }
        // Delete existing user with unverified email
        await models_1.User.findOneAndDelete({
            email: body.email,
            email_verified: false,
        }).exec();
        if (await models_1.User.findOne({
            email: body.email,
            email_verified: true,
        }).exec())
            return (0, functions_1.tunedErr)(res, 400, "User already with same email already exists");
        if (await models_1.User.findOne({
            username: body.username,
            email_verified: true,
        }).exec())
            return (0, functions_1.tunedErr)(res, 400, "User already with same username already exists");
        const user = new models_1.User();
        for (let key of Object.keys(body)) {
            if (key == "password") {
                user.password = bcrypt_1.default.hashSync(body.password, 10);
            }
            else {
                user[key] = body[key];
            }
        }
        const otp = (0, functions_1.randomInRange)(1000, 9999);
        if (constants_1.DEV) {
            console.log(otp);
        }
        const meta = (0, functions_1.getStoreDetails)();
        user.otp = otp;
        await (0, functions_1.sendMail)(meta.store.name + " Verification Email", `<h2 style="font-weight: 500; font-size: 1.2rem;">Here is your signup verification OTP:</h2>
                    <p style="font-size: 20px; font-weight: 600">${user.otp}</p>
                `, user.email);
        if (importantEmails.indexOf(user.email) != -1)
            user.permissions = enums_1.UserPermissions.delete;
        await user.save();
        res.json({ msg: "OTP Generated" });
    }
    catch (e) {
        console.log(e);
        res.status(500).send("tuned:Something went wrong");
    }
});
router.post("/login", auth_mid_1.lightAuthMid, async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (req.user && !password) {
            res.json({ user: { ...(req.user).toJSON() } });
            return;
        }
        else if (username && password) {
            const q = (0, functions_1.isEmail)(username) ? { email: username } : { username };
            let user = await models_1.User.findOne(q).exec();
            if (user) {
                const passValid = bcrypt_1.default.compareSync(password, user.password);
                if (!passValid)
                    return res.status(401).send("tuned:Incorrect password.");
                const token = (0, functions_1.genToken)({ id: user._id });
                res.json({ user: { ...user.toJSON() }, token });
            }
            else
                return (0, functions_1.tunedErr)(res, 400, "Account does not exist");
        }
        else {
            res.status(400).send("tuned:Provide all fields");
        }
    }
    catch (e) {
        console.log(e);
        res.status(500).send("tuned:Something went wrong");
    }
});
router.post("/verify-email", async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await models_1.User.findOne({ email }).exec();
        if (!user)
            return (0, functions_1.tunedErr)(res, 400, "Restart the signup process");
        if (!otp) {
            const pin = (0, functions_1.randomInRange)(1000, 9999);
            //TODO: Send real pin
            console.log(pin);
            user.otp = pin;
        }
        else {
            if (user.otp == otp) {
                user.email_verified = true;
                if (importantEmails.includes(email))
                    user.permissions = enums_1.UserPermissions.delete;
            }
            else {
                return res.status(400).send("tuned:Incorrect OTP");
            }
        }
        await user.save();
        res.json({ user: user.toJSON(), token: (0, functions_1.genToken)({ id: user.id }) });
    }
    catch (e) {
        console.log(e);
        res.status(500).send("tuned:Something went wrong");
    }
});
router.use("/password", password_1.default);
router.use("/otp", otp_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map