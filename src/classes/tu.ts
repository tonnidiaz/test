import { WebSocket } from "ws";
import type { ClientOptions, RawData } from "ws";
import type { ClientRequestArgs } from "http";
import { sleep, timedLog } from "@/utils/functions";
import { IObj, IOrderbook } from "@/utils/interfaces";
import { parseDate } from "@/utils/funcs2";

export class TuWs extends WebSocket {
    channels: { channel: string; data: IObj }[] = [];
    plat: string = "okx";
    lastSub: number;

    constructor(
        address: string | URL,
        options?: ClientOptions | ClientRequestArgs | undefined
    ) {
        super(address, options);
        this.lastSub = Date.now()
    }

   async sub(channel: string, data: IObj = {}) {
        console.log("\n", { channel }, "\n");
        if (this.readyState != this.OPEN) {
            this.channels.push({ channel, data });
        } else {
            if (Date.now() - this.lastSub < 3000){
                await sleep(3000)
            }
            this.send(
                JSON.stringify({
                    op: "subscribe",
                    //params: { binary: false },
                    args:
                        this.plat == "bybit"
                            ? [channel]
                            : [{ channel, ...data }],
                })
            );
            this.lastSub = Date.now()
        }
    }
    unsub(channel: string, data: IObj = {}) {
        console.log(`\nUNSUSCRIBING FROM ${channel}`, data, "\n");
        this.send(
            JSON.stringify({
                op: "unsubscribe",
                //params: { binary: false },
                args: this.plat == "bybit" ? [channel] : [{ channel, ...data }],
            })
        );
    }

    
}
