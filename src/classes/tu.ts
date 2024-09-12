import { WebSocket } from "ws";
import type { ClientOptions, RawData } from "ws";
import type { ClientRequest, ClientRequestArgs, IncomingMessage } from "http";
import { sleep, timedLog } from "@/utils/functions";
import { IObj, IOrderbook } from "@/utils/interfaces";
import { parseDate } from "@/utils/funcs2";
import { DEV } from "@/utils/constants";
const readyStateMap = {
    0: "CONNECTING",
    1: "OPEN",
    2: "CLOSING",
    3: "CLOSED",
};
export class TuWs extends WebSocket {
    channels: { channel: string; data: IObj; plat: string }[] = [];
    plat: string = "okx";
    lastSub: number;

    constructor(
        address: string | URL,
        options?: ClientOptions | ClientRequestArgs | undefined
    ) {
        super(address, options);
        this.lastSub = Date.now();
    }

    keepAlive() {
        if (this.readyState === this.OPEN) {
            this.ping();
            if (DEV)
            console.log("Ping sent to server");
        }
    }
    

    async sub(channel: string, plat: string, data: IObj = {}) {
        console.log(
            "\n",
            { channel, state: readyStateMap[this.readyState] },
            "\n"
        );
        if (this.readyState != this.OPEN && false) {
            this.channels.push({ channel, data, plat });
        } else {
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
            }
            this.send(JSON.stringify(json));
            this.lastSub = Date.now();
        }
    }

 
    unsub(channel: string, plat: string, data: IObj = {}) {
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
        }
        this.send(JSON.stringify(json));
    }
}


export class CrossArbitData {
    platA: string | undefined
    platB: string | undefined
    pair: string[] = []
    bookA: IOrderbook | undefined
    bookB: IOrderbook | undefined
}