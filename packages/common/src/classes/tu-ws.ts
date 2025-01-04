import { sleep, timedLog } from "@cmn/utils/functions";
import { TuArbitWs } from "./tu";
import { DEV } from "@cmn/utils/constants";
import { IObj, TPlatName } from "@cmn/utils/interfaces";
import { platList } from "@cmn/utils/consts3";
import { ClientRequestArgs } from "node:http";
import ws, { ClientOptions } from "ws";
import { WS } from "@cmn/utils/bend/consts";
const crossList: IObj = {};
const triList: IObj = {};

const readyStateMap = {
    0: "CONNECTING",
    1: "OPEN",
    2: "CLOSING",
    3: "CLOSED",
};

const SLEEP_MS = 10 * 1000;

for (let plat of platList.filter(el=> el != 'binance' && el != 'bybit' && el != 'gateio')) {
    triList[plat] = new TuArbitWs(plat, "tri");
    crossList[plat] = new TuArbitWs(plat, "cross");
}
export const triArbitWsList: { [key: string]: TuArbitWs } = triList;
export const crossArbitWsList: { [key: string]: TuArbitWs } = crossList;

export const initArbitWs = async () => {
    try {
        const wsList = [
            ...Object.values(triArbitWsList),
            ...Object.values(crossArbitWsList),
        ];
        for (let ws of wsList) {
            //if (!DEV || false) await ws.initWs();
            
        }
    } catch (e) {
        timedLog("FAILED TO INIT WS");
        console.log(e);
    }
};



export class TuWs {
    channels: { channel: string; data: IObj; plat: string }[] = [];
    plat: TPlatName;
    lastSub: number;
    ws: ws.WebSocket;

    constructor(
        address: string | URL,
        plat: TPlatName,
        options?: ClientOptions | ClientRequestArgs | undefined
    ) {
        this.plat = plat;

        console.log({ plat: this.plat, address });
        this.ws = new WS(address);

        this.lastSub = Date.now();
    }

    on(event: string, cb: (...data: any[]) => any) {
        return this.ws.on(event as any, cb);
    }

    keepAlive(id?: string) {
        if (this.ws.readyState === this.ws.OPEN) {
            {
                this.ws.ping();
                if (this.plat == "bitget") this.ws.send("ping");
            }

            // if (DEV)
            // console.log(`[ ${id ?? 'WS'} ] Ping sent to server\n`);
        }
    }

    async sub(channel: string, plat: TPlatName, data: IObj = {}) {
        if (plat == "mexc") channel += "@5";
        else if (plat == "binance")
            channel = channel.replace("ch", "").toLowerCase() + "@depth";

        console.log(
            "\n",
            { channel, state: readyStateMap[this.ws.readyState] },
            "\n"
        );
        if (this.ws.readyState != this.ws.OPEN) {
            this._log("NOT OPEN: ADDING CHANNELS INSTEAD");
            // this.channels.push({ channel, data, plat });
            // Wait for ws to open
            // await new Promise((res) => {
            //     const val = setInterval(() => {
            //         const ready = this.ws.readyState == ws.OPEN;
            //         console.log(`Waiting for ws to open [ ${ready} ]...`);
            //         if (ready) {
            //             clearInterval(val);
            //             res('ok');
            //         }
            //     }, 1000);
            // });

            return
        }

        if (Date.now() - this.lastSub < 3000) {
            await sleep(3000);
        }

        let json: IObj = {
            op: "subscribe",
            args: plat == "bybit" ? [channel] : [{ channel, ...data }],
        };

        switch (plat) {
            case "kucoin":
                json = {
                    type: "subscribe",
                    topic: channel, //Topic needs to be subscribed. Some topics support to divisional subscribe the informations of multiple trading pairs through ",".
                    privateChannel: false, //Adopted the private channel or not. Set as false by default.
                    response: true,
                };
                break;
            case "mexc":
            case "binance":
                json = {
                    method:
                        plat == "binance" ? "SUBSCRIBE" : "SUBSCRIPTION",
                    params: [channel],
                    id: Date.now(),
                };
                break;
        }
        this.ws.send(JSON.stringify(json));
        this.lastSub = Date.now();
    }

    unsub(channel: string, plat: TPlatName, data: IObj = {}) {
        if (plat == "mexc") channel += "@5";
        else if (plat == "binance")
            channel = channel.replace("ch", "").toLowerCase() + "@depth";
        console.log(`\nUNSUSCRIBING FROM ${channel}`, data, "\n");

        let json: IObj = {
            op: "unsubscribe",
            args: plat == "bybit" ? [channel] : [{ channel, ...data }],
        };

        switch (plat) {
            case "kucoin":
                json = {
                    type: "unsubscribe",
                    topic: channel, //Topic needs to be subscribed. Some topics support to divisional subscribe the informations of multiple trading pairs through ",".
                    privateChannel: false, //Adopted the private channel or not. Set as false by default.
                    response: true,
                };
                break;
            case "mexc":
            case "binance":
                json = {
                    method:
                        plat == "binance" ? "UNSUBSCRIBE" : "UNSUBSCRIPTION",
                    params: [channel],
                    id: Date.now(),
                };
                break;
        }
        this.ws.send(JSON.stringify(json));
    }
    _log(...args: any) {
        timedLog(`[WS][${this.plat}] `, ...args);
    }
}
