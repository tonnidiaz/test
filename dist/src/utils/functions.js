"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearTerminal = exports.getSymbol = exports.findAve = exports.randomNum = exports.isBetween = exports.isSameDate = exports.sleep = exports.getMinAmt = exports.getMaxAmt = exports.getMaxSz = exports.getMinSz = exports.getPricePrecision = exports.getCoinPrecision = exports.precision = exports.ceil = exports.toFixed = exports.capitalizeFirstLetter = exports.timedLog = exports.botLog = exports.readJson = exports.tunedErr = exports.randomInRange = exports.genOTP = exports.genToken = exports.getStoreDetails = exports.sendMail = exports.isEmail = exports.clog = void 0;
const otp_1 = require("../models/otp");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
const { env } = process;
const test = false;
function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
exports.randomInRange = randomInRange;
const genToken = (data, exp) => {
    const { SECRET_KEY } = process.env;
    return exp
        ? jsonwebtoken_1.default.sign({
            data,
        }, SECRET_KEY, { expiresIn: exp })
        : jsonwebtoken_1.default.sign({ payload: data }, SECRET_KEY);
};
exports.genToken = genToken;
const genOTP = async (phone, email) => {
    const pin = randomInRange(1000, 9999);
    const otp = new otp_1.OTP();
    otp.pin = pin;
    if (phone)
        otp.phone = phone;
    else
        otp.email = email;
    await otp.save();
    return otp;
};
exports.genOTP = genOTP;
function clog(message, ...params) {
    console.log(message, ...params);
}
exports.clog = clog;
const okx_instrus_1 = require("@/utils/data/instrus/okx-instrus");
const binance_info_1 = require("./binance-info");
const bybit_instrus_1 = require("./data/instrus/bybit-instrus");
const funcs2_1 = require("./funcs2");
const bitget_instrus_1 = require("@/utils/data/instrus/bitget-instrus");
const gateio_instrus_1 = require("@/utils/data/instrus/gateio-instrus");
const mexc_instrus_1 = require("./data/instrus/mexc-instrus");
const tunedErr = (res, status, msg, e) => {
    if (e) {
        console.log(e);
    }
    return res.status(status).send(`tuned:${msg}`);
};
exports.tunedErr = tunedErr;
const sendMail = async (subject, body, clients, sender) => {
    try {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer_1.default.createTransport({
            host: process.env.GMAIL_HOST, //"smtp.ethereal.email",
            port: Number(process.env.GMAIL_PORT),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL, //testAccount.user, // generated ethereal user
                pass: process.env.GMAIL_PASSWORD, //testAccount.pass, // generated ethereal password
            },
        });
        const storeDetails = getStoreDetails();
        // send mail with defined transport object
        const _sender = sender ?? storeDetails.store.email;
        console.log("SENDING FROM: ", _sender);
        console.log("SENDING MAIL TO: ", clients);
        let info = await transporter.sendMail({
            from: `"${storeDetails.store.name}" <${_sender}>`, // sender address
            to: `"${clients}"`, // list of receivers
            subject, // Subject line
            html: `<html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style type="text/css">
              .tb {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif  !important;
                margin: auto;
                padding: 10px;
                color: black;
              }
        
              .btn {
                cursor: pointer;
                display: inline-block;
                min-height: 1em;
                outline: 0;
                border: none;
                vertical-align: baseline;
                background: #e0e1e2 none;
                color: rgba(0, 0, 0, 0.6);
                font-family: Lato, "Helvetica Neue", Arial, Helvetica, sans-serif;
                margin: 0 0.25em 0 0;
                padding: 10px 16px;
                text-transform: none;
                text-shadow: none;
                font-weight: 600;
                line-height: 1em;
                font-style: normal;
                text-align: center;
                text-decoration: none;
                border-radius: 0.28571429rem;
                box-shadow: inset 0 0 0 1px transparent,
                  inset 0 0 0 0 rgba(34, 36, 38, 0.15);
                -webkit-user-select: none;
                -ms-user-select: none;
                user-select: none;
                transition: opacity 0.1s ease, background-color 0.1s ease,
                  color 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
                will-change: "";
                -webkit-tap-highlight-color: transparent;
              }
              .btn-primary {
                color: #fff !important;
                background-color: #0d6efd !important;
                border-color: #0d6efd !important;
              }
              .btn-danger {
                color: #fff !important;
                background-color: #fd950d !important;
                border-color: #fd950d !important;
              }
        a{
          color: #f08800 !important;
          font-weight: 600 !important;
        }
              table {
               
               
                width: 100%;
                
                border-radius: 10px !important;
                padding: 5px;
                border-collapse: collapse;
              }
        
              td,
              th {
                border: 2px solid #8f8f8f;
                text-align: left;
                padding: 8px;
              }
        
              tr:nth-child(even) {
                background-color: #e6e6e6;
              }
        
              .otp {
                /*background-color: #c4c4c4;
                border: 2px dashed #d37305;
                padding: 10px;
                border-radius: 5px;
                width: 150px;
                text-align: center;
                font-weight: 700;
                letter-spacing: 6;
                font-family: monospace;
                font-size: 20px;*/
              }
              .text-c{
                text-align: center !important;
              }

              .m-auto{
                margin: 0 auto;
              }
            </style>
          </head>
          <body>
  
              <div class="tb">
              <h2>${storeDetails.store.name} app</h2>
              ${body}
              <p>For support please contact the Developer at <a href="mailto:${storeDetails.developer.email}">${storeDetails.developer.email}</a></p>
              </div>
  
          </body>
          </html>
                `, // html body
        });
        console.log("Message sent: %s", info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
        return "Email sent";
    }
    catch (err) {
        console.log(err);
        return null;
    }
};
exports.sendMail = sendMail;
const jsonPath = __dirname + "/../assets/store.json";
const getStoreDetails = () => {
    const buff = fs_1.default.readFileSync(jsonPath, { encoding: "utf-8" });
    return JSON.parse(buff);
};
exports.getStoreDetails = getStoreDetails;
const isEmail = (emailAdress) => {
    let regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailAdress.match(regex) ? true : false;
};
exports.isEmail = isEmail;
const readJson = (fp) => {
    const data = fs_1.default.readFileSync(fp, { encoding: "utf-8" });
    return JSON.parse(data);
};
exports.readJson = readJson;
const botLog = (bot, ...data) => {
    console.log(`\n[${(0, funcs2_1.parseDate)(new Date())}] [ ${bot.name} ]`, ...data, "\n");
};
exports.botLog = botLog;
const timedLog = (...args) => console.log(`[${(0, funcs2_1.parseDate)(new Date())}]`, ...args);
exports.timedLog = timedLog;
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
exports.capitalizeFirstLetter = capitalizeFirstLetter;
function toFixed(num, dec) {
    const re = new RegExp("^-?\\d+(?:.\\d{0," + (dec || -1) + "})?");
    const isLarge = `${num}`.includes("e");
    return (isLarge || dec == 0) ? num : Number(num.toString().match(re)[0]);
}
exports.toFixed = toFixed;
function ceil(num, dec) {
    const isLarge = `${num}`.includes("e");
    return (isLarge || dec == 0) ? num : Number(num.toFixed(dec));
}
exports.ceil = ceil;
function precision(a) {
    if (!isFinite(a))
        return 0;
    var e = 1, p = 0;
    while (Math.round(a * e) / e !== a) {
        e *= 10;
        p++;
    }
    return p; //p == 1 ? p : p - 1;
}
exports.precision = precision;
function getCoinPrecision(pair, oType, plat) {
    const _base = pair[0], _quote = pair[1];
    let instru = getInstru(pair, plat);
    if (!instru) {
        console.log(`\getCoinPrecision: ${pair} not on ${plat}\n`);
        return null;
    }
    ;
    let pr = 0;
    const is_quote = oType == 'market';
    switch (plat) {
        case 'binance':
            const _i0 = instru;
            pr = Number(oType == 'market' ? _i0.quoteAssetPrecision : _i0.baseAssetPrecision);
            break;
        case 'bitget':
            const _i1 = instru;
            pr = Number(is_quote ? _i1.quotePrecision : _i1.quantityPrecision);
            break;
        case 'bybit':
            const _i2 = instru;
            pr = precision(Number(is_quote ? _i2.lotSizeFilter.quotePrecision : _i2.lotSizeFilter.basePrecision));
            break;
        case 'okx':
            const _i3 = instru;
            pr = precision(Number(is_quote ? _i3.tickSz : _i3.lotSz));
            break;
        case 'gateio':
            const _i4 = instru;
            pr = Number(is_quote ? _i4.precision : _i4.amount_precision);
            break;
        case 'mexc':
            const _i5 = instru;
            pr = Number(is_quote ? _i5.quoteAssetPrecision : _i5.baseAssetPrecision);
            break;
    }
    return pr;
}
exports.getCoinPrecision = getCoinPrecision;
const getInstru = (pair, plat) => {
    const _base = pair[0], _quote = pair[1];
    let instru;
    switch (plat) {
        case "binance":
            instru = binance_info_1.binanceInfo.symbols.find((el) => el.baseAsset == pair[0] && el.quoteAsset == pair[1]);
            break;
        case "bybit":
            instru = bybit_instrus_1.bybitInstrus.find((el) => el.baseCoin == _base && el.quoteCoin == _quote && el.status == "Trading");
            break;
        case "bitget":
            instru = bitget_instrus_1.bitgetInstrus.find(el => el.baseCoin == _base && el.quoteCoin == _quote);
            break;
        case "okx":
            instru = okx_instrus_1.okxInstrus.find((el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]);
            break;
        case "gateio":
            instru = gateio_instrus_1.gateioInstrus.find(el => el.base == _base && el.quote == _quote);
            break;
        case "mexc":
            instru = mexc_instrus_1.mexcInstrus.find(el => el.baseAsset == _base && el.quoteAsset == _quote && el.status == '1' && el.isSpotTradingAllowed);
            break;
    }
    return instru;
};
function getPricePrecision(pair, plat) {
    let instru = getInstru(pair, plat);
    if (!instru) {
        console.log(`\ngetPricePrecision: ${pair} not on ${plat}\n`);
        return null;
    }
    ;
    let pr = null;
    switch (plat) {
        case 'binance':
            const _i0 = instru;
            pr = Number(_i0.quoteAssetPrecision);
            break;
        case 'bitget':
            const _i1 = instru;
            pr = Number(_i1.pricePrecision);
            break;
        case 'bybit':
            const _i2 = instru;
            pr = precision(Number(_i2.priceFilter.tickSize));
            break;
        case 'okx':
            const _i3 = instru;
            pr = precision(Number(_i3.tickSz));
            break;
        case 'gateio':
            const _i4 = instru;
            pr = Number(_i4.precision);
            break;
        case 'mexc':
            const _i5 = instru;
            pr = Number(_i5.quotePrecision);
            break;
    }
    return pr;
}
exports.getPricePrecision = getPricePrecision;
function getMinSz(pair, plat) {
    if (test)
        return -Infinity;
    const _base = pair[0], _quote = pair[1];
    let instru = getInstru(pair, plat);
    if (!instru) {
        console.log(`\ngetMinSz: ${pair} not on ${plat}\n`);
        return null;
    }
    ;
    let sz = null;
    switch (plat) {
        case 'binance':
            const _i0 = instru;
            sz = Number(_i0.filters[3].minQty);
            break;
        case 'bitget':
            const _i1 = instru;
            sz = Number(_i1.minTradeAmount);
            break;
        case 'bybit':
            const _i2 = instru;
            sz = Number(_i2.lotSizeFilter.minOrderQty);
            break;
        case 'okx':
            const _i3 = instru;
            sz = Number(_i3.minSz);
            break;
        case 'gateio':
            const _i4 = instru;
            sz = Number(_i4.min_base_amount);
            break;
        case 'mexc':
            const _i5 = instru;
            sz = -Infinity; //Number(_i5.min_base_amount)
            break;
    }
    return sz;
}
exports.getMinSz = getMinSz;
function getMaxSz(pair, plat) {
    if (test)
        return Infinity;
    const _base = pair[0], _quote = pair[1];
    let instru = getInstru(pair, plat);
    if (!instru) {
        console.log(`\ngetMaxSz: ${pair} not on ${plat}\n`);
        return null;
    }
    ;
    let sz = null;
    switch (plat) {
        case 'binance':
            const _i0 = instru;
            sz = Number(_i0.filters[3].maxQty);
            break;
        case 'bitget':
            const _i1 = instru;
            sz = Number(_i1.maxTradeAmount);
            break;
        case 'bybit':
            const _i2 = instru;
            sz = Number(_i2.lotSizeFilter.maxOrderQty);
            break;
        case 'okx':
            const _i3 = instru;
            sz = Number(_i3.maxLmtSz);
            break;
        case 'gateio':
            const _i4 = instru;
            sz = Number(_i4.max_base_amount);
            break;
        case 'mexc':
            const _i5 = instru;
            sz = Infinity; //Number(_i5.max_base_amount)
            break;
    }
    return sz;
}
exports.getMaxSz = getMaxSz;
function getMaxAmt(pair, plat) {
    if (test)
        return Infinity;
    const _base = pair[0], _quote = pair[1];
    let instru = getInstru(pair, plat);
    if (!instru) {
        console.log(`\ngetMinSz: ${pair} not on ${plat}\n`);
        return null;
    }
    ;
    let sz = null;
    switch (plat) {
        case 'binance':
            const _i0 = instru;
            sz = Infinity;
            break;
        case 'bitget':
            const _i1 = instru;
            sz = Number(_i1.maxTradeAmount);
            break;
        case 'bybit':
            const _i2 = instru;
            sz = Number(_i2.lotSizeFilter.maxOrderAmt);
            break;
        case 'okx':
            const _i3 = instru;
            sz = Number(_i3.maxMktAmt);
            break;
        case 'gateio':
            const _i4 = instru;
            sz = Number(_i4.max_quote_amount);
            break;
        case 'mexc':
            const _i5 = instru;
            sz = Number(_i5.maxQuoteAmount);
            break;
    }
    return sz;
}
exports.getMaxAmt = getMaxAmt;
function getMinAmt(pair, plat) {
    const _base = pair[0], _quote = pair[1];
    let instru = getInstru(pair, plat);
    if (!instru) {
        console.log(`\ngetMinSz: ${pair} not on ${plat}\n`);
        return null;
    }
    ;
    let sz = null;
    sz = 1; // 1 USDT MIN
    return sz;
}
exports.getMinAmt = getMinAmt;
const sleep = async (ms) => {
    await new Promise((res) => setTimeout(res, ms));
};
exports.sleep = sleep;
const isSameDate = (d1, d2) => {
    const _d1 = d1.toISOString().split("T");
    const _d1Date = _d1[0], _d1Time = _d1[1].slice(0, 5);
    const _d2 = d2.toISOString().split("T");
    const _d2Date = _d2[0], _d2Time = _d2[1].slice(0, 5);
    return _d1Date == _d2Date && _d1Time == _d2Time;
};
exports.isSameDate = isSameDate;
const isBetween = (l, num, h) => {
    let ret = false;
    if (h == 0 || l == 0) {
        ret = h == 0 ? l < num : num < h;
    }
    else {
        ret = l < num && num < h;
    }
    return ret;
};
exports.isBetween = isBetween;
function randomNum(min, max) {
    return Math.random() * (max - min) + min;
}
exports.randomNum = randomNum;
const findAve = (numbers) => {
    const sum = numbers.reduce((a, c) => a + c, 0);
    const avg = sum / numbers.length;
    return avg;
};
exports.findAve = findAve;
const getSymbol = (pair, plat) => {
    plat = plat.toLowerCase();
    let sep = '';
    switch (plat) {
        case 'okx':
            sep = '-';
            break;
        case 'gateio':
            sep = '_';
            break;
    }
    return pair.join(sep);
};
exports.getSymbol = getSymbol;
const clearTerminal = () => { process.stdout.write('\x1Bc'); };
exports.clearTerminal = clearTerminal;
//# sourceMappingURL=functions.js.map