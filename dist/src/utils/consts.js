"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platforms = void 0;
const test_binance_1 = require("@/classes/test-binance");
const test_bitget_1 = require("@/classes/test-bitget");
const test_gateio_1 = require("@/classes/test-gateio");
const test_mexc_1 = require("@/classes/test-mexc");
const test_platforms_1 = require("@/classes/test-platforms");
exports.platforms = {
    binance: test_binance_1.TestBinance,
    bybit: test_platforms_1.TestBybit,
    okx: test_platforms_1.TestOKX,
    gateio: test_gateio_1.TestGateio,
    bitget: test_bitget_1.TestBitget,
    mexc: test_mexc_1.TestMexc,
};
//# sourceMappingURL=consts.js.map