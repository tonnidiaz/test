"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var okx_1 = require("@/classes/okx");
var test_binance_1 = require("@/classes/test-binance");
var models_1 = require("@/models");
var constants_1 = require("@/utils/constants");
var funcs_1 = require("@/utils/funcs");
var funcs2_1 = require("@/utils/funcs2");
var functions_1 = require("@/utils/functions");
var fs_1 = require("fs");
var years = [2022, 2023, 2024, 2020], symbols = ["AVAX/USDT"], intervals = [15];
function downloader(_a) {
    var symbol = _a.symbol, start = _a.start, end = _a.end, interval = _a.interval;
    return __awaiter(this, void 0, void 0, function () {
        var symbArr, fname, fpath, useOkx, bin, bot, okx, plat, klines;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Downloading...");
                    symbArr = symbol.split("/");
                    fname = "".concat(symbArr.join('-'), "_").concat(interval, "m_").concat(start, "_").concat(end, ".json").replace(/[\/|\\:*?"<>]/g, " ");
                    console.log(fname);
                    fpath = (0, funcs2_1.tuPath)("".concat(constants_1.klinesDir, "/").concat(fname));
                    (0, funcs_1.ensureDirExists)(fpath);
                    useOkx = false;
                    symbol = useOkx ? symbArr.join("-") : symbArr.join("");
                    bin = new test_binance_1.TestBinance();
                    bot = new models_1.Bot({
                        name: "TBOT",
                        base: symbArr[0],
                        ccy: symbArr[1],
                        interval: interval,
                    });
                    okx = new okx_1.OKX(bot);
                    plat = useOkx ? okx : bin;
                    return [4 /*yield*/, plat.getKlines({
                            symbol: symbol,
                            start: Date.parse(start),
                            end: Date.parse(end),
                            interval: interval,
                            savePath: fpath
                        })];
                case 1:
                    klines = _b.sent();
                    console.log("DONE DOWNLOADING KLINES");
                    return [2 /*return*/];
            }
        });
    });
}
var dld = function (_a) {
    var _b = _a.parse, parse = _b === void 0 ? false : _b, _c = _a.useOkx, useOkx = _c === void 0 ? true : _c;
    return __awaiter(void 0, void 0, void 0, function () {
        var bin, _i, years_1, year, _d, symbols_1, symb, _e, intervals_1, interval, msymb, fname, klinesPath, dfsPath, bot, okx, plat, klines, df;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    bin = new test_binance_1.TestBinance();
                    _i = 0, years_1 = years;
                    _f.label = 1;
                case 1:
                    if (!(_i < years_1.length)) return [3 /*break*/, 10];
                    year = years_1[_i];
                    _d = 0, symbols_1 = symbols;
                    _f.label = 2;
                case 2:
                    if (!(_d < symbols_1.length)) return [3 /*break*/, 8];
                    symb = symbols_1[_d];
                    _e = 0, intervals_1 = intervals;
                    _f.label = 3;
                case 3:
                    if (!(_e < intervals_1.length)) return [3 /*break*/, 6];
                    interval = intervals_1[_e];
                    console.log("\nDownloading ".concat(symb, ", ").concat(year, ", ").concat(interval, "m\n"));
                    msymb = symb.split("/");
                    symb = useOkx ? msymb.join("-") : msymb.join("");
                    fname = "".concat(symb, "_").concat(interval, "m.json");
                    klinesPath = "".concat(constants_1.klinesDir, "/").concat(year, "/").concat(fname);
                    dfsPath = "".concat(constants_1.dfsDir, "/").concat(year, "/").concat(fname);
                    (0, funcs_1.ensureDirExists)(klinesPath);
                    bot = new models_1.Bot({
                        name: "TBOT",
                        base: msymb[0],
                        ccy: msymb[1],
                        interval: interval,
                    });
                    okx = new okx_1.OKX(bot);
                    plat = useOkx ? okx : bin;
                    return [4 /*yield*/, plat.getKlines({
                            symbol: symb,
                            start: Date.parse("".concat(year, "-01-01 00:00:00 GMT+2")),
                            end: Date.parse("".concat(year, "-12-31 23:59:00 GMT+2")),
                            interval: interval,
                            savePath: klinesPath,
                        })];
                case 4:
                    klines = _f.sent();
                    if (parse && klines) {
                        df = (0, funcs2_1.chandelierExit)((0, funcs2_1.heikinAshi)((0, funcs2_1.parseKlines)(klines)));
                        (0, funcs_1.ensureDirExists)(dfsPath);
                        (0, fs_1.writeFileSync)(dfsPath, JSON.stringify(df));
                    }
                    console.log("Done with interval=".concat(interval, "\n"));
                    _f.label = 5;
                case 5:
                    _e++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("Done with symbol=".concat(symb, "\n"));
                    _f.label = 7;
                case 7:
                    _d++;
                    return [3 /*break*/, 2];
                case 8:
                    console.log("Done with year=".concat(year, "\n"));
                    _f.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 1];
                case 10: return [2 /*return*/];
            }
        });
    });
};
var createDf = function (year, interval, symb) { return __awaiter(void 0, void 0, void 0, function () {
    var fname, klinesPath, dfsPath, klines, df;
    return __generator(this, function (_a) {
        fname = "".concat(symb, "_").concat(interval, "m.json");
        klinesPath = "".concat(constants_1.klinesDir, "/").concat(year, "/").concat(fname);
        dfsPath = "".concat(constants_1.dfsDir, "/").concat(year, "/").concat(fname);
        console.log("Begin: ".concat(year, ", ").concat(interval, "m, ").concat(symb, "\n"));
        if (!(0, fs_1.existsSync)(klinesPath)) {
            console.log("KLINES DO NOT EXISTS");
            return [2 /*return*/];
        }
        klines = (0, functions_1.readJson)(klinesPath);
        df = (0, funcs2_1.chandelierExit)((0, funcs2_1.heikinAshi)((0, funcs2_1.parseKlines)(klines)));
        (0, funcs_1.ensureDirExists)(dfsPath);
        (0, fs_1.writeFileSync)(dfsPath, JSON.stringify(df));
        return [2 /*return*/];
    });
}); };
var klinesToDf = function (fp, saveFp) { return __awaiter(void 0, void 0, void 0, function () {
    var klines, df;
    return __generator(this, function (_a) {
        if (!(0, fs_1.existsSync)(fp)) {
            console.log("KLINES DO NOT EXISTS");
            return [2 /*return*/];
        }
        klines = (0, functions_1.readJson)(fp);
        df = (0, funcs2_1.chandelierExit)((0, funcs2_1.heikinAshi)((0, funcs2_1.parseKlines)(klines)));
        (0, funcs_1.ensureDirExists)(saveFp);
        (0, fs_1.writeFileSync)(saveFp, JSON.stringify(df));
        console.log("DONE WRITING DF");
        return [2 /*return*/];
    });
}); };
function afterKlines() {
    for (var _i = 0, years_2 = years; _i < years_2.length; _i++) {
        var year = years_2[_i];
        for (var _a = 0, intervals_2 = intervals; _a < intervals_2.length; _a++) {
            var interval = intervals_2[_a];
            for (var _b = 0, symbols_2 = symbols; _b < symbols_2.length; _b++) {
                var symb = symbols_2[_b];
                createDf(year, interval, symb);
            }
        }
    }
}
//dld({useOkx: false})
createDf(2024, 15, "AVAXUSDT");
//afterKlines()
function test() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
}
//downloader({symbol: 'SUI/USDT', start: '2023-01-01 00:00:00 GMT+2', end: '2023-10-31 23:59:00 GMT+2', interval: 5})
var fp = "src/data/klines/binance/SOL-USDT_15m_2024-05-01 00 00 00 GMT+2_2024-06-11 23 59 00 GMT+2.json";
var saveFp = "src/data/dfs/binance/SOL-USDT_15m_2024-05-01 00 00 00 GMT+2_2024-06-11 23 59 00 GMT+2.json";
//klinesToDf(fp, saveFp)
