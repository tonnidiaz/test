import { WebSocket} from "ws";
import type {ClientOptions, RawData} from "ws"
import type {ClientRequestArgs} from "http"
import { timedLog } from "@/utils/functions";

export class TuWs extends WebSocket{
    constructor(address: string | URL, options?: ClientOptions | ClientRequestArgs | undefined){
       
        super(address, options)
    }

    sub(channels: string | string[]){
        console.log('\n', {channels} , '\n');
       
        this.send(JSON.stringify({
            op: 'subscribe', args: typeof channels == 'string' ? [channels] : channels
        }))
    }
    unsub(channels: string | string[]){
        this.send(JSON.stringify({
            op: 'unsubscribe', args: typeof channels == 'string' ? [channels] : channels
        }))
    }

    parseData(resp: RawData){
        const {topic, data} = JSON.parse(resp.toString());
        return {topic, data}
    }
}
