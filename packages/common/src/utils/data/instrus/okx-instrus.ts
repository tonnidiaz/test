

const instru = {
    alias: "",
    baseCcy: "TESTPM",
    category: "1",
    ctMult: "",
    ctType: "",
    ctVal: "",
    ctValCcy: "",
    expTime: "",
    instFamily: "",
    instId: "TESTPM-USDT",
    instType: "SPOT",
    lever: "10",
    listTime: "",
    lotSz: "0.00000001",
    maxIcebergSz: "", 
    maxLmtAmt: "1000000",
    maxLmtSz: "9999999999",
    maxMktAmt: "1000000",
    maxMktSz: "1000000", 
    maxStopSz: "1000000",
    maxTriggerSz: "",
    maxTwapSz: "",
    minSz: "0.00001",
    optType: "",
    quoteCcy: "USDT",
    ruleType: "normal",
    settleCcy: "",
    state: "test",
    stk: "",
    tickSz: "0.1",
    uly: "",
}
type Instru = typeof instru

import instrus from "./okx-instrus.json"
export const okxInstrus: Instru[] =  instrus as any

