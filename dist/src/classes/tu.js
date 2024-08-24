"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuWs = void 0;
const ws_1 = require("ws");
class TuWs extends ws_1.WebSocket {
    constructor(address, options) {
        super(address, options);
    }
    sub(channels) {
        console.log('\n', { channels }, '\n');
        this.send(JSON.stringify({
            op: 'subscribe', args: typeof channels == 'string' ? [channels] : channels
        }));
    }
    unsub(channels) {
        this.send(JSON.stringify({
            op: 'unsubscribe', args: typeof channels == 'string' ? [channels] : channels
        }));
    }
    parseData(resp) {
        const { topic, data } = JSON.parse(resp.toString());
        return { topic, data };
    }
}
exports.TuWs = TuWs;
//# sourceMappingURL=tu.js.map