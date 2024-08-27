import { Socket } from "socket.io";
import { Server } from "ws";
import { IObj } from "../interfaces";
import { ARBIT_ZERO_FEES } from "../constants";
import { getInstrus, getMakerFee, getTakerFee } from "../funcs3";
import { ensureDirExists } from "../orders/funcs";
import { readJson, } from "../functions";
import {existsSync} from 'fs'

export const onTriArbitCointest = async (
    data: IObj,
    client?: Socket,
    io?: Server
) => {
    let {
        plat,
        interval,
        start,
        end,
        demo,
        bal,
        show,
        only,
        join,
        prefix,
        B,
        ep,
        save,
        clId
    } = data;

    try {
        console.log("BEGIN COINTEST...\n");
        prefix = prefix ? `${prefix}_` : "";

        const MAKER = ARBIT_ZERO_FEES ? 0 : getMakerFee(plat),
            TAKER = ARBIT_ZERO_FEES ? 0 : getTakerFee(plat);
        const QUOTE_FEE = 0,
            BASE_FEE = 0;
        let msg = "";
        let _data: {pair: string, profit: number, trades: number}[] = []
        let ret_data: IObj = {}
        const year = Number(start.split("-")[0]);

        const savePath = `_data/rf/arbit-tri/coins/${plat}/${year}/${B}_${interval}m.json`

        const parseData = () =>{
            ret_data = {...ret_data, data: _data, clId }
            return ret_data
        }
        if (show){
            if (!existsSync(savePath)){
                return client?.emit(ep, {err: savePath + " DOES TO EXIST"})
            }
            _data = await readJson(savePath)
            client?.emit(ep, parseData())
            return _data
        }
        if (save)
            ensureDirExists(savePath);

        let instrus = getInstrus(plat)
        const instrusWithBQuote = instrus.filter(el=> el[1] == B)

        for (let instru of instrusWithBQuote){
            const A = "USDT", C = instru[0]

            const pairA = [B, A], pairB = [C, B], pairC = [C, A]
            console.log("BEGIN PAIR:", pairB, "\n")


        }
        console.log("\nDONE")
    } catch (e: any) {
        console.log(e.response?.data ?? e);
        client?.emit(ep, { err: "Something went wrong" });
    }
};
