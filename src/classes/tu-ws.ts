import { timedLog } from "@/utils/functions";
import { TuArbitWs } from "./tu";

export const triArbitWsList : {[key: string]: TuArbitWs}= {
    okx: new TuArbitWs("okx", 'tri'),
    bybit: new TuArbitWs("bybit", 'tri'),
    kucoin: new TuArbitWs("kucoin", 'tri'),
    bitget: new TuArbitWs("bitget", 'tri'),
};
export const crossArbitWsList : {[key: string]: TuArbitWs}= {
    okx: new TuArbitWs("okx", 'cross'),
    bybit: new TuArbitWs("bybit", 'cross'),
    kucoin: new TuArbitWs("kucoin", 'cross'),
    bitget: new TuArbitWs("bitget", 'cross'),
};

export const initArbitWs = async () => {
    try {
        const wsList = [...Object.values(triArbitWsList), ...Object.values(crossArbitWsList)]
        for (let ws  of wsList) {
            await ws.initWs();
        }
    } catch (e) {
        timedLog("FAILED TO INIT WS");
        console.log(e);
    }
};
