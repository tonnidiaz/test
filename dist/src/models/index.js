"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Test = exports.Order = exports.Bot = exports.User = void 0;
const mongoose_1 = require("mongoose");
const user_1 = require("./user");
const bot_1 = require("./bot");
const order_1 = require("./order");
const test_1 = require("./test");
const User = (0, mongoose_1.model)("User", user_1.UserSchema);
exports.User = User;
const Bot = (0, mongoose_1.model)("Bot", bot_1.BotSchema);
exports.Bot = Bot;
const Order = (0, mongoose_1.model)("Order", order_1.OrderSchema);
exports.Order = Order;
const Test = (0, mongoose_1.model)("Test", test_1.TestSchema);
exports.Test = Test;
const o = new Order();
//# sourceMappingURL=index.js.map