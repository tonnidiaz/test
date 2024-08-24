"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSchema = void 0;
const mongoose_1 = require("mongoose");
exports.TestSchema = new mongoose_1.Schema({
    name: { type: String, default: '' },
    cars: { type: [{ _id: false, name: String, speed: Number }], default: [] },
}, { timestamps: true, versionKey: false });
//# sourceMappingURL=test.js.map