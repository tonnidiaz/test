import { WebSocket } from "ws";
import type { ClientOptions, RawData } from "ws";
import type { ClientRequestArgs } from "http";
import { sleep, timedLog } from "@/utils/functions";
import { IObj, IOrderbook } from "@/utils/interfaces";
import { parseDate } from "@/utils/funcs2";

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

    async sub(channel: string, plat: string, data: IObj = {}) {
        console.log("\n", { channel }, "\n");
        if (this.readyState != this.OPEN) {
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
            args: this.plat == "bybit" ? [channel] : [{ channel, ...data }],
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
