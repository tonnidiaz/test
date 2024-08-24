"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parentStrategies = exports.strategies = exports.objStrategies = void 0;
const ce_sma_1 = require("./ce-sma");
const sl_tp_1 = require("./sl-tp");
const macd_1 = require("./macd");
const def_1 = require("./def");
const def5_adv_1 = require("./def5-adv");
const def_60_1 = require("./def-60");
const cloud_5_1 = require("./cloud-5");
const impr_5_1 = require("./impr-5");
exports.objStrategies = [...macd_1.strategies, ...ce_sma_1.strategies, ...sl_tp_1.strategies];
exports.strategies = exports.objStrategies.map(e => e.toJson());
exports.parentStrategies = {
    def5: def_1.DefTester,
    def5_adv: def5_adv_1.Def5Adv,
    def60: def_60_1.DefTester60,
    cloud5: cloud_5_1.Cloud5,
    impr5: impr_5_1.Impr5,
};
//# sourceMappingURL=index.js.map