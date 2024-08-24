"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../../models");
const constants_1 = require("../../utils/constants");
const functions_1 = require("../../utils/functions");
const router = (0, express_1.Router)();
router.post("/resend", async (req, res) => {
    try {
        const { phone, email } = req.body;
        const user = phone ? (await models_1.User.findOne({ phone }).exec()) : email ?
            (await models_1.User.findOne({ email }).exec()) : null;
        if (!user) {
            return (0, functions_1.tunedErr)(res, 400, "User does not exist");
        }
        const otp = (0, functions_1.randomInRange)(1000, 9999);
        user.otp = otp;
        if (constants_1.DEV)
            console.log(otp);
        const storeDetails = (0, functions_1.getStoreDetails)();
        await (0, functions_1.sendMail)(`${storeDetails.store.name} Verification Email`, `<h2 style="font-weight: 500; font-size: 1.2rem;">Here is your Email verification OTP:</h2>
                    <p class='m-auto' style="font-size: 20px; font-weight: 600">${otp}</p>
                `, email);
        await user.save();
        res.send("OTP endpoint");
    }
    catch (e) {
        console.log(e);
        return (0, functions_1.tunedErr)(res, 500, "Something went wrong");
    }
});
router.post("/verify", async (req, res) => {
    const { phone, email, otp, new_email } = req.body;
    console.log(email);
    let user;
    if (!otp)
        return res.status(400).send("tuned:Please provide OTP.");
    if (phone) {
        // Phone verification
        user = await models_1.User.findOne({ phone }).exec();
        if (!user)
            return res
                .status(404)
                .send(`tuned:Account with number: ${phone} does not exist!`);
        if (user.otp != otp)
            return res.status(400).send("tuned:Incorrect OTP.");
        user.phone_verified = true;
        user.otp = null;
    }
    else if (email) {
        // Email verification
        user = await models_1.User.findOne({ email }).exec();
        if (!user)
            return (0, functions_1.tunedErr)(res, 400, `Account with email: ${email} does not exist!`);
        if (user.otp != otp)
            return (0, functions_1.tunedErr)(res, 400, "tuned:Incorrect OTP.");
        user.email_verified = true;
    }
    else if (new_email) {
        user = await models_1.User.findOne({ new_email }).exec();
        if (!user)
            return (0, functions_1.tunedErr)(res, 400, `Incorrect credentials!`);
        if (user.otp != otp)
            return (0, functions_1.tunedErr)(res, 400, "tuned:Incorrect OTP");
        // Asign new email to email
        user.email = new_email;
    }
    await user.save();
    const token = (0, functions_1.genToken)({ id: user._id });
    res.json({ user: { ...user.toJSON() }, token });
});
exports.default = router;
//# sourceMappingURL=otp.js.map