"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../models/index");
const router = express_1.default.Router();
/* GET users listing. */
router.get('/', async function (req, res, next) {
    const { id } = req.query;
    let users = [];
    try {
        if (id) {
            const user = await index_1.User.findById(id).exec();
            if (!user)
                return res.status(404).json({ msg: "User not found" });
            users.push(user);
        }
        else {
            users = (await index_1.User.find().exec()).filter(it => it.email_verified && it.first_name);
        }
        res.json({ users: users.map(it => it.toJSON()) });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ msg: "Something went wrong!" });
    }
});
router.post('/delete', async (req, res) => {
    try {
        const { ids } = req.body;
        // Delete all users from the provided ids
        for (let id of ids) {
            try {
                console.log(`Deleting ${id}`);
                await index_1.User.findByIdAndDelete(id).exec();
                //Delete cart, orders, and reviews
            }
            catch (e) {
                console.log(e);
                continue;
            }
        }
        res.send("Users deleted");
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Something went wrong" });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map