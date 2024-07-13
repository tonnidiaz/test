import { OTP } from "../models/otp";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import fs from "fs";
const { env } = process;
import { Response } from "express";

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
import { IObj } from "./interfaces";
import { IBot } from "@/models/bot";
import { instruments } from "./constants";
import { okxInstrus } from "@/data/okx-instrus";
import { binanceInfo } from "./binance-info";

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

export const botLog = (bot: IBot, data: any) => {
    console.log(`\n[ ${bot.name} ]`, data, '\n');
};

export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function toFixed(num: number, dec: number) {
    const re = new RegExp("^-?\\d+(?:.\\d{0," + (dec || -1) + "})?");
    return `${num}`.includes('e') ? num : Number(num.toString().match(re)![0]);
}

export function precision(a: number) {
    if (!isFinite(a)) return 0;
    var e = 1,
        p = 0;
    while (Math.round(a * e) / e !== a) {
        e *= 10;
        p++;
    }
    return p;
}

export function getCoinPrecision(
    pair: string[],
    oType: 'limit' | 'market',
    plat: "bybit" | "okx" | "binance"
) {
    const instru: IObj | undefined =
        plat == "binance" ? binanceInfo.symbols.find(el=> el.baseAsset == pair[0] && el.quoteAsset == pair[1]) : (plat == "bybit"
            ? instruments.find(
                  (el) =>
                      el.baseCoin == pair[0] && el.quoteCoin == pair[1]
              )
            : okxInstrus.find(
                  (el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]
              ));
    if (!instru) return 0;
    if (plat == "binance"){return Number(oType == "market" ? instru.quoteAssetPrecision : instru.baseAssetPrecision)}
    const pr = (plat == "bybit"
            ? oType == "market"
                ? instru.quotePrecision
                : instru?.basePrecision
            : oType == "market"
            ? instru.tickSz
            : instru.lotSz);
    return precision(Number(pr));
}
export function getPricePrecision(pair: string[], plat: "binance" | "bybit" | "okx") {
    const instru: IObj | undefined =
        plat == "binance" ? binanceInfo.symbols.find(el=> el.baseAsset == pair[0] && el.quoteAsset == pair[1]) : ( plat == "bybit"
            ? instruments.find(
                  (el) =>
                      el.baseCoin == pair[0] && el.quoteCoin == pair[1]
              )
            : okxInstrus.find(
                  (el) => el.baseCcy == pair[0] && el.quoteCcy == pair[1]
              ));
    if (!instru) return 0;
    
    return plat == 'binance' ? Number(instru.quoteAssetPrecision) :  precision(
        Number(instru[plat == "bybit" ? "minPricePrecision" : "tickSz"])
    );
}
export const sleep = async (ms: number) => {
    await new Promise((res) => setTimeout(res, ms));
};



export const isSameDate = (d1: Date, d2: Date)=>{
    const _d1 = d1.toISOString().split('T')
    const _d1Date = _d1[0], _d1Time = _d1[1].slice(0, 5)

    const _d2 = d2.toISOString().split('T')
    const _d2Date = _d2[0], _d2Time = _d2[1].slice(0, 5)
    return _d1Date == _d2Date && _d1Time == _d2Time
}