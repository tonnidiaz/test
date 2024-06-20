import express, { Request } from "express";
import bcrypt from "bcrypt";
import { User } from "../../models";
import {
    genToken,
    randomInRange, 
    tunedErr,
    sendMail,
    getStoreDetails,
    isEmail,
} from "../../utils/functions";
import otpRouter from "./otp";
import passwordRouter from "./password";
import { lightAuthMid } from "@/middleware/auth.mid";
import { UserPermissions } from "@/utils/enums";
import { DEV } from "@/utils/constants";

const importantEmails = [
    "tonnidiazed@gmail.com",
    "clickbait4587@gmail.com",
    "openbytes@yahoo.com",
    "nyandenilebohang@gmail.com",
    "squashetonics@gmail.com",
];
const router = express.Router();

router.post("/signup", async (req, res) => {
    try {
        const { body, query } = req;

        if (query.act == "complete") {
            const user = await User.findOne({ email: body.email }).exec();
            for (let k of Object.keys(body)) {
                if (k != "password") {
                    user!.set(k, body[k]);
                }
            }
            await user!.save();
            const token = genToken({ id: user!._id });
            return res.json({ token });
        }

        // Delete existing user with unverified email
        await User.findOneAndDelete({
            email: body.email,
            email_verified: false,
        }).exec();

        if (
            await User.findOne({
                email: body.email,
                email_verified: true,
            }).exec()
        )
            return tunedErr(
                res,
                400,
                "User already with same email already exists"
            );

        if (
            await User.findOne({
                username: body.username,
                email_verified: true,
            }).exec()
        )
            return tunedErr(
                res,
                400,
                "User already with same username already exists"
            );

        const user = new User();
        for (let key of Object.keys(body)) {
            if (key == "password") {
                user.password = bcrypt.hashSync(body.password, 10);
            } else {
                user[key] = body[key];
            }
        }
        const otp = randomInRange(1000, 9999);
        if (DEV) {
            console.log(otp);
        }
        const meta = getStoreDetails();
        user.otp = otp;

        await sendMail(
            meta.store.name + " Verification Email",
            `<h2 style="font-weight: 500; font-size: 1.2rem;">Here is your signup verification OTP:</h2>
                    <p style="font-size: 20px; font-weight: 600">${user.otp}</p>
                `,
            user.email
        );


        // const smsRes = await sendSMS(number, `Tukoffee - your code is: ${otp}`)
        //console.log(smsRes.data)
        if (importantEmails.indexOf(user.email) != -1)
            user.permissions = UserPermissions.delete;

        console.log(user.password);
        await user.save();
        res.json({ msg: "OTP Generated" });
    } catch (e) {
        console.log(e);
        res.status(500).send("tuned:Something went wrong");
    }
});

router.post("/login", lightAuthMid, async (req: Request, res, next) => {
    try {
        const { username, password } = req.body;
        if (req.user && !password) {
            //Loging in with token

            res.json({ user: { ...(await req.user).toJSON() } });
            return;
        } else if (username && password) {
            const q = isEmail(username) ? { email: username } : { username };
            let user = await User.findOne(q).exec();
            if (user) {
                const passValid = bcrypt.compareSync(password, user.password);

                if (!passValid)
                    return res.status(401).send("tuned:Incorrect password.");
                const token = genToken({ id: user._id });
                res.json({ user: { ...user.toJSON() }, token });
            } else return tunedErr(res, 400, "Account does not exist");
        } else {
            res.status(400).send("tuned:Provide all fields");
        }
    } catch (e) {
        console.log(e);
        res.status(500).send("tuned:Something went wrong");
    }
});

router.post("/verify-email", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email }).exec();
        if (!user) return tunedErr(res, 400, "Restart the signup process");

        if (!otp) {
            const pin = randomInRange(1000, 9999);
            //TODO: Send real pin
            console.log(pin);
            user.otp = pin;
        } else {
            if (user.otp == otp) {
                user.email_verified = true;
                if (importantEmails.includes(email))
                    user.permissions = UserPermissions.delete;
            } else {
                return res.status(400).send("tuned:Incorrect OTP");
            }
        }
        await user.save();
        res.json({ user: user.toJSON(), token: genToken({ id: user.id }) });
    } catch (e) {
        console.log(e);
        res.status(500).send("tuned:Something went wrong");
    }
});
router.use("/password", passwordRouter);

router.use("/otp", otpRouter);
export default router;
