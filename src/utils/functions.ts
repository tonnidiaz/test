import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import fs from "fs";
const { env } = process;
import { Response } from "express";
import { IObj } from "./interfaces"
import { IBee } from "@/models/bee";
import { Job } from "node-schedule";
import axios from "axios";
import { api } from "./api";

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

export function clog(message?: any, ...params: any[]) {
    console.log(message, ...params);
}


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
export { sendMail, getStoreDetails, genToken, randomInRange, tunedErr };

export const readJson = (fp: string) => {
    const data = fs.readFileSync(fp, { encoding: "utf-8" });
    return JSON.parse(data);
};

const ddNum = (e: any) => {
    e = `${e}`.trim();
    return e.length == 1 ? `0${e}` : e;
};
const toISOString = (date: string) => {
    let dateArr = date.split(",");
    let time = dateArr[1];
    time = time
        .split(":")
        .map((el) => ddNum(el))
        .join(":");
    dateArr = dateArr[0].split("/");
    date = `${dateArr[0]}-${ddNum(dateArr[1])}-${ddNum(dateArr[2])}`;
    return `${date} ${time}+02:00`;
};
export const parseDate = (date: Date | string | number) =>
    toISOString(
        new Date(date).toLocaleString("en-ZA", {
            timeZone: "Africa/Johannesburg",
        })
    );


export const timedLog = (...args)=>console.log(`[${parseDate(new Date())}]`, ...args)
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function toFixed(num: number, dec: number) {
    const re = new RegExp("^-?\\d+(?:.\\d{0," + (dec || -1) + "})?");
    return `${num}`.includes('e') ? num : Number(num.toString().match(re)![0]);
}


export const isBetween = (l: number, num: number, h: number)=>{
    let ret = false
    if (h == 0 || l == 0 ){
        ret = h == 0 ? l < num : num < h
    }else{
        ret = l < num && num < h
    }
    return ret
}



export function randomNum(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export const beeJob = async (job: Job, bee: IBee)=>{
    try {
        if (!bee.active) return
        timedLog(`Bee-${bee.name} sting`)
        const r = await api().post('/sting', {interval: 10, name: bee.name})
        console.log(r.data)
        bee.stings.push(parseDate(new Date()))
        await bee.save()
    } catch (err) {
        console.log(err)
    }
}