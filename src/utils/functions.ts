import { OTP } from "../models/otp";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import fs from "fs";
const { env } = process;
import { Response } from "express";



const test = false

function randomInRange(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const genToken = (data: IObj, exp?: string | number | undefined) => {
    const { SECRET_KEY } = process.env;
    return exp
        ? jwt.sign(
              {
                  data,
              },
              SECRET_KEY!,
              { expiresIn: exp }
          )
        : jwt.sign({ payload: data }, SECRET_KEY!);
};
const genOTP = async (phone?: string, email?: string) => {
    const pin = randomInRange(1000, 9999);
    const otp = new OTP();
    otp.pin = pin;
    if (phone) otp.phone = phone;
    else otp.email = email;
    await otp.save();
    return otp;
};

export function clog(message?: any, ...params: any[]) {
    console.log(message, ...params);
}

import axios from "axios";
import { ICandle, IObj } from "./interfaces";
import { IBot } from "@/models/bot";
import { okxInstrus } from "@/utils/data/instrus/okx-instrus";
import { binanceInfo } from "./binance-info";
import { bybitInstrus } from "./data/instrus/bybit-instrus";
import { parseDate } from "./funcs2";
import { bitgetInstrus } from "@/utils/data/instrus/bitget-instrus";
import { gateioInstrus } from "@/utils/data/instrus/gateio-instrus";

const tunedErr = (res: Response, status: number, msg: string, e?: any) => {
    if (e) {
        console.log(e);
    }
    return res.status(status).send(`tuned:${msg}`);
};

const sendMail = async (
    subject: string,
    body: string,
    clients: string | string[],
    sender?: string
) => {
    try {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
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
    } catch (err) {
        console.log(err);
        return null;
    }
};
const jsonPath = __dirname + "/../assets/store.json";
const getStoreDetails = () => {
    const buff = fs.readFileSync(jsonPath, { encoding: "utf-8" });
    return JSON.parse(buff);
};

export const isEmail = (emailAdress: string) => {
    let regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailAdress.match(regex) ? true : false;
};
export { sendMail, getStoreDetails, genToken, genOTP, randomInRange, tunedErr };

export const readJson = (fp: string) => {
    const data = fs.readFileSync(fp, { encoding: "utf-8" });
    return JSON.parse(data);
};

export const botLog = (bot: IBot, ...data: any) => {
    console.log(`\n[${parseDate(new Date())}] [ ${bot.name} ]`, ...data, "\n");
};

export const timedLog = (...args) =>
    console.log(`[${parseDate(new Date())}]`, ...args);
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function toFixed(num: number, dec: number) {
    const re = new RegExp("^-?\\d+(?:.\\d{0," + (dec || -1) + "})?");
   const isLarge =  `${num}`.includes("e")
    return  (isLarge || dec == 0) ? num : Number(num.toString().match(re)![0]);
}
export function ceil(num: number, dec: number) {
   const isLarge =  `${num}`.includes("e")
    return  (isLarge || dec == 0) ? num : Number(num.toFixed(dec))
}

export function precision(a: number) {
    if (!isFinite(a)) return 0;
    var e = 1,
        p = 0;
    while (Math.round(a * e) / e !== a) {
        e *= 10;
        p++;
    }
    return p == 1 ? p : p - 1;
}

export function getCoinPrecision(
    pair: string[],
    oType: "limit" | "market",
    plat: string
) {
    const _base = pair[0], _quote = pair[1];
    let instru : IObj | undefined;

    switch(plat){
        case "binance":
            instru = binanceInfo.symbols.find(
                  (el) => el.baseAsset == pair[0] && el.quoteAsset == pair[1]
              );
            break;
        case "bybit":
            instru = bybitInstrus.find(
                  (el) => el.baseCoin == pair[0] && el.quoteCoin == pair[1]
              );
            break;
        case "bitget":
            instru = bitgetInstrus.find(el => el.baseCoin == _base && el.quoteCoin == _quote);
            break;
        case "okx":
            instru = okxInstrus.find(
                  (el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]
              );
            break;
        case "gateio":
            instru = gateioInstrus.find(el => el.base == _base && el.quote == _quote);
            break;
    }
     
    if (!instru) {
        console.log(`\getCoinPrecision: ${pair} not on ${plat}\n`)
        return null};
    
    
        let pr: number |null = 0;
        const is_quote = oType == 'market'
        switch(plat){
            
            case 'binance':
                const _i0 = instru as typeof binanceInfo.symbols[0]
                pr = Number(oType == 'market' ? _i0.quoteAssetPrecision : _i0.baseAssetPrecision)
                break
            case 'bitget':
                const _i1 = instru as typeof bitgetInstrus[0]
                pr = Number( is_quote ? _i1.quotePrecision : _i1.quantityPrecision)
                break
            case 'bybit':
                const _i2 = instru as typeof bybitInstrus[0]
                
                pr = precision(Number( is_quote ? _i2.quotePrecision : _i2.basePrecision)) 
                break
            case 'okx':
                const _i3 = instru as typeof okxInstrus[0]
                pr = precision(Number( is_quote ? _i3.tickSz : _i3.lotSz)) 
                break;
    
            case 'gateio':
                const _i4 = instru as typeof gateioInstrus[0]
                pr = Number(is_quote ? _i4.precision : _i4.amount_precision)
                break
        }
        return pr
}
export function getPricePrecision(
    pair: string[],
    plat: string
) {

    const _base = pair[0], _quote = pair[1];
    let instru : IObj | undefined;

    switch(plat){
        case "binance":
            instru = binanceInfo.symbols.find(
                  (el) => el.baseAsset == pair[0] && el.quoteAsset == pair[1]
              );
            break;
        case "bybit":
            instru = bybitInstrus.find(
                  (el) => el.baseCoin == pair[0] && el.quoteCoin == pair[1]
              );
            break;
        case "bitget":
            instru = bitgetInstrus.find(el => el.baseCoin == _base && el.quoteCoin == _quote);
            break;
        case "okx":
            instru = okxInstrus.find(
                  (el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]
              );
            break;
        case "gateio":
            instru = gateioInstrus.find(el => el.base == _base && el.quote == _quote);
            break;
    }
     
    if (!instru) {
        console.log(`\ngetPricePrecision: ${pair} not on ${plat}\n`)
        return null};

    let pr: number | null = null
    switch(plat){
        
        case 'binance':
            const _i0 = instru as typeof binanceInfo.symbols[0]
            pr = Number(_i0.quoteAssetPrecision)
            break
        case 'bitget':
            const _i1 = instru as typeof bitgetInstrus[0]
            pr = Number(_i1.pricePrecision)
            break
        case 'bybit':
            const _i2 = instru as typeof bybitInstrus[0]
            pr = precision(Number(_i2.quotePrecision)) 
            break
        case 'okx':
            const _i3 = instru as typeof okxInstrus[0]
            pr = precision(Number(_i3.tickSz)) 
            break;

        case 'gateio':
            const _i4 = instru as typeof gateioInstrus[0]
            pr = Number(_i4.precision)
            break
    }
    return pr
}

export function getMinSz(
    pair: string[],
    plat: string
) {
    if (test)  return -Infinity;
    const _base = pair[0], _quote = pair[1];
    let instru : IObj | undefined;

    switch(plat){
        case "binance":
            instru = binanceInfo.symbols.find(
                  (el) => el.baseAsset == pair[0] && el.quoteAsset == pair[1]
              );
            break;
        case "bybit":
            instru = bybitInstrus.find(
                  (el) => el.baseCoin == pair[0] && el.quoteCoin == pair[1]
              );
            break;
        case "bitget":
            instru = bitgetInstrus.find(el => el.baseCoin == _base && el.quoteCoin == _quote);
            break;
        case "okx":
            instru = okxInstrus.find(
                  (el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]
              );
            break;
        case "gateio":
            instru = gateioInstrus.find(el => el.base == _base && el.quote == _quote);
            break;
    }
     
    if (!instru) {
        console.log(`\ngetMinSz: ${pair} not on ${plat}\n`)
        return null};
        

        let sz: number | null = null
        switch(plat){
            
            case 'binance':
                const _i0 = instru as typeof binanceInfo.symbols[0]
                sz = Number(_i0.filters[3].minQty)
                break
            case 'bitget':
                const _i1 = instru as typeof bitgetInstrus[0]
                sz = Number(_i1.minTradeAmount)
                break
            case 'bybit':
                const _i2 = instru as typeof bybitInstrus[0]
                sz = Number(_i2.minTradeQty)
                break
            case 'okx':
                const _i3 = instru as typeof okxInstrus[0]
                sz = Number(_i3.minSz)
                break;
    
            case 'gateio':
                const _i4 = instru as typeof gateioInstrus[0]
                sz = Number(_i4.min_base_amount)
                break
        }
        return sz
}
export function getMaxSz(
    pair: string[],
    plat: string
) {
    if (test)  return Infinity;
    const _base = pair[0], _quote = pair[1];
    let instru : IObj | undefined;

    switch(plat){
        case "binance":
            instru = binanceInfo.symbols.find(
                  (el) => el.baseAsset == pair[0] && el.quoteAsset == pair[1]
              );
            break;
        case "bybit":
            instru = bybitInstrus.find(
                  (el) => el.baseCoin == pair[0] && el.quoteCoin == pair[1]
              );
            break;
        case "bitget":
            instru = bitgetInstrus.find(el => el.baseCoin == _base && el.quoteCoin == _quote);
            break;
        case "okx":
            instru = okxInstrus.find(
                  (el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]
              );
            break;
        case "gateio":
            instru = gateioInstrus.find(el => el.base == _base && el.quote == _quote);
            break;
    }
     
    if (!instru) {
        console.log(`\ngetMaxSz: ${pair} not on ${plat}\n`)
        return null};

        let sz: number | null = null
        switch(plat){
            
            case 'binance':
                const _i0 = instru as typeof binanceInfo.symbols[0]
                sz = Number(_i0.filters[3].maxQty)
                break
            case 'bitget':
                const _i1 = instru as typeof bitgetInstrus[0]
                sz = Number(_i1.maxTradeAmount)
                break
            case 'bybit':
                const _i2 = instru as typeof bybitInstrus[0]
                sz = Number(_i2.maxTradeQty)
                break
            case 'okx':
                const _i3 = instru as typeof okxInstrus[0]
                sz = Number(_i3.maxLmtSz)
                break;
    
            case 'gateio':
                const _i4 = instru as typeof gateioInstrus[0]
                sz = Number(_i4.max_base_amount)
                break
        }
        return sz
}
export function getMaxAmt(
    pair: string[],
    plat: string
) {
    if (test)  return Infinity;
    const _base = pair[0], _quote = pair[1];
    let instru : IObj | undefined;

    switch(plat){
        case "binance":
            instru = binanceInfo.symbols.find(
                  (el) => el.baseAsset == pair[0] && el.quoteAsset == pair[1]
              );
            break;
        case "bybit":
            instru = bybitInstrus.find(
                  (el) => el.baseCoin == pair[0] && el.quoteCoin == pair[1]
              );
            break;
        case "bitget":
            instru = bitgetInstrus.find(el => el.baseCoin == _base && el.quoteCoin == _quote);
            break;
        case "okx":
            instru = okxInstrus.find(
                  (el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]
              );
            break;
        case "gateio":
            instru = gateioInstrus.find(el => el.base == _base && el.quote == _quote);
            break;
    }
     
    if (!instru) {
        console.log(`\ngetMinSz: ${pair} not on ${plat}\n`)
        return null};
        

        let sz : number | null = null
        switch(plat){
            
            case 'binance':
                const _i0 = instru as typeof binanceInfo.symbols[0]
                sz = Infinity
                break
            case 'bitget':
                const _i1 = instru as typeof bitgetInstrus[0]
                sz = Number(_i1.maxTradeAmount)
                break
            case 'bybit':
                const _i2 = instru as typeof bybitInstrus[0]
                sz = Number(_i2.maxTradeAmt)
                break
            case 'okx':
                const _i3 = instru as typeof okxInstrus[0]
                sz = Number(_i3.maxMktAmt)
                break;
    
            case 'gateio':
                const _i4 = instru as typeof gateioInstrus[0]
                sz = Number(_i4.max_quote_amount)
                break
        }
        return sz
}

export const sleep = async (ms: number) => {
    await new Promise((res) => setTimeout(res, ms));
};

export const isSameDate = (d1: Date, d2: Date) => {
    const _d1 = d1.toISOString().split("T");
    const _d1Date = _d1[0],
        _d1Time = _d1[1].slice(0, 5);

    const _d2 = d2.toISOString().split("T");
    const _d2Date = _d2[0],
        _d2Time = _d2[1].slice(0, 5);
    return _d1Date == _d2Date && _d1Time == _d2Time;
};

export const isBetween = (l: number, num: number, h: number) => {
    let ret = false;
    if (h == 0 || l == 0) {
        ret = h == 0 ? l < num : num < h;
    } else {
        ret = l < num && num < h;
    }
    return ret;
};

export function randomNum(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export const findAve = (numbers: number[]) => {
    const sum = numbers.reduce((a, c) => a + c, 0);
    const avg = sum / numbers.length;
    return avg;
};

export const getSymbol = (pair: string[], plat: string, )=>{
    plat = plat.toLowerCase()
    let sep = ''
    switch(plat){
        case  'okx':
            sep = '-';
            break;
        case 'gateio':
            sep = '_';
            break;
    }

    return pair.join(sep)
}

export const clearTerminal = () =>{process.stdout.write('\x1Bc'); }