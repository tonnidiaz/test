import { timedLog } from "@cmn/utils/functions";
import { TuArbitWs } from "./tu";
import { DEV } from "@cmn/utils/constants";
import { IObj } from "@cmn/utils/interfaces";
import { platList } from "@cmn/utils/consts3";
const crossList: IObj = {};
const triList: IObj = {};

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
