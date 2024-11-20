import { MEXC_API_ROOT_URL } from "@cmn/utils/constants";
import { clearTerminal, handleErrs } from "@cmn/utils/functions";
import { IObj } from "@cmn/utils/interfaces";
import axios from "axios";
import crypto from "crypto";
const API_KEY = "mx0vglR0dU8JNJmrFM",
    API_SECRET = "bb585ac193cf4d52a0c876f98f1b02bb";
const client = axios.create({
    baseURL: MEXC_API_ROOT_URL,
    headers: {
        "X-MEXC-APIKEY": API_KEY,
        "Content-Type": "application/json",
    },
});

const genSignature = (params: IObj) => {
    const _params = {};
    for (let k of Object.keys(params).sort()) {
        const v = params[k];
        if (!v) continue;
        _params[k] = v;
    }

    const prehashString = new URLSearchParams(_params).toString();
    console.log({ prehashString });
    const signature = crypto
        .createHmac("sha256", API_SECRET)
        .update(prehashString)
        .digest("hex");
    return signature;
};
client.interceptors.request.use((config) => {
    const timestamp = Date.now();
    let params = config.params || {};

    params.timestamp = timestamp;
    const signature = genSignature(params).toLowerCase()
    params = {...params, signature};
    config.params = params;
    return config;
});

async function main() {
    clearTerminal();
    try {
        const params = {coin: "USDT", network: "Optimism(OP)"}
        const r = await client.post("/capital/deposit/address", undefined, {params});
        console.log(r.data);
    } catch (err) {
        handleErrs(err);
    }
}

main();
