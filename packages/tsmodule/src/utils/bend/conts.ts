import axios from "axios";
import bignumber_js from "bignumber.js";
// import binance from "binance";
// import binance_api_node from "binance-api-node";
import bitget_api from "bitget-api";
import bybit_api from "bybit-api";
import cors from "cors";
import dotenv from "dotenv";
import gate_api from "gate-api";
import indicatorts from "indicatorts";
import jsonwebtoken from "jsonwebtoken";
import * as kucoin_api from "kucoin-api";
import mexc_api_sdk from "mexc-api-sdk";
import mongoose from "mongoose";
// import node_mexc_apis from "node-mexc-apis";
import node_schedule from "node-schedule";
import nodemailer from "nodemailer";
import okx_api from "okx-api";
import * as socket_io from "socket.io";

export const meta = import.meta.url;
const _data = {
    axios, 
    bignumber_js,
    // binance,
    // binance_api_node,
    bitget_api,
    bybit_api,
    cors,
    dotenv,
    gate_api,
    indicatorts,
    jsonwebtoken,
    kucoin_api,
    mexc_api_sdk,
    mongoose,
    // node_mexc_apis,
    node_schedule,
    nodemailer,
    okx_api,
    socket_io,
};

console.log({ meta });
console.log({ _data });
export const getData = () => {
    console.log({ _data });
    return Object.values(_data).map((el) => typeof el);
};
