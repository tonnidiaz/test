import { WebSocket } from "ws";
import type { ClientOptions, RawData } from "ws";
import type { ClientRequestArgs } from "http";
import { timedLog } from "@/utils/functions";
import { IObj } from "@/utils/interfaces";

export class TuWs extends WebSocket {
    channels: { channel: string; data: IObj }[] = [];

    constructor(
        address: string | URL,
        options?: ClientOptions | ClientRequestArgs | undefined
    ) {
        super(address, options);
    }

    sub(channel: string, data: IObj = {}) {
        console.log("\n", { channel }, "\n");
        if (this.readyState != this.OPEN) {
            this.channels.push({ channel, data });
        } else {
            this.send(
                JSON.stringify({
                    op: "subscribe",
                    args: [{ channel, ...data }],
                })
            );
        }
    }
    unsub(channel: string, data: IObj = {}) {
        console.log(`\nUNSUSCRIBING FROM ${channel}`, data, "\n")
        this.send(
            JSON.stringify({
                op: "unsubscribe",
                args: [{channel, ...data}],
            })
        );
    }
  
    parseData(resp: RawData) {
        const parsedResp = JSON.parse(resp.toString());
        let { topic, data, arg } = parsedResp;
        topic = topic ?? arg?.channel;
        if (!topic) console.log(parsedResp)
        const symbol = arg?.instId ?? "----";
        return { channel: topic, symbol, data };
    }
}
