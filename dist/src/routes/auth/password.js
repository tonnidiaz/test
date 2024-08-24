"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_mid_1 = require("@/middleware/auth.mid");
const models_1 = require("../../models");
const constants_1 = require("../../utils/constants");
const functions_1 = require("../../utils/functions");
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.post("/reset", async (req, res) => {
    try {
        // If phone/email && no otp, genotp else verify otp
        const { act } = req.query;
        const { email, phone, otp, password } = req.body;
        const user = phone ? (await models_1.User.findOne({ phone }).exec()) : (email ?
            (await models_1.User.findOne({ email }).exec()) : null);
        if (!user) {
            return res.status(400).send("tuned:Account does not exist");
        }
        if (act == "reset") {
            console.log("password reset");
            user.password = bcrypt_1.default.hashSync(password, 10);
        }
        else if (act == "verify-otp") {
            if (otp == user.otp) {
                console.log("OTP Verified");
                user.otp = undefined;
            }
            else {
                return res.status(400).send("tuned:Incorrect OTP");
            }
        }
        else if (act == "gen-otp") {
            const _otp = (0, functions_1.randomInRange)(1000, 9999);
            if (constants_1.DEV) {
                console.log(_otp);
            }
            user.otp = _otp;
            const storeDetails = (0, functions_1.getStoreDetails)();
            await (0, functions_1.sendMail)(`${storeDetails.store.name} Verification Email`, `<h2 style="font-weight: 500; font-size: 1.2rem;">Here is your Email verification OTP:</h2>
                <p class="m-auto" style="font-size: 20px; font-weight: 600">${_otp}</p>
            `, email);
        }
        await user.save();
        return res.send("OTP sent");
    }
    catch (e) {
        console.log(e);
        res.status(500).send("Something went wrong!");
    }
});
router.post("/verify", auth_mid_1.lightAuthMid, async (req, res) => {
    try {
        const { password } = req.body;
        const oldPassValid = bcrypt_1.default.compareSync(password, req.user.password);
        if (!oldPassValid) {
            return res.status(401).send("tuned:Incorrect password!");
        }
        res.send("Password Ok");
    }
    catch (e) {
        console.log(e);
        res.status(500).send("tuned:Something went wrong");
    }
});
router
    .route("/change")
    .post(auth_mid_1.authMid, async (req, res) => {
    try {
        const { old: oldPass, new: newPass } = req.body;
        const oldPassValid = bcrypt_1.default.compareSync(oldPass, req.user.password);
        if (!oldPassValid) {
            res.status(401).send("tuned:Incorrect password!");
        }
        else {
            const newHash = bcrypt_1.default.hashSync(newPass, 10);
            req.user.password = newHash;
            await req.user.save();
            res.send(newPass);
        }
    }
    catch (e) {
        console.log(e);
        res.status(500).send("tuned:Something went wrong");
    }
});
exports.default = router;
//# sourceMappingURL=password.js.map