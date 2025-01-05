import axios from "axios"
import bignumber_js from "bignumber.js"
import binance from "binance"
import binance_api_node from "binance-api-node"
import bitget_api from "bitget-api"
import bybit_api from "bybit-api"
import cors from "cors"
import dotenv from "dotenv"
import fs from "fs"
import gate_api from "gate-api"
import indicatorts from "indicatorts"
import jsonwebtoken from "jsonwebtoken"
import kucoin_api from "kucoin-api"
import mexc_api_sdk from "mexc-api-sdk"
import mongoose from "mongoose"
import node_mexc_apis from "node-mexc-apis"
import node_schedule from "node-schedule"
import nodemailer from "nodemailer"
import okx_api from "okx-api"
import socket_io from "socket.io"


export const meta = import.meta.url
console.log({meta});