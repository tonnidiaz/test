
import { TestBinance } from "@/classes/test-binance";
import { TestBitget } from "@/classes/test-bitget";
import { TestGateio } from "@/classes/test-gateio";
import { TestMexc } from "@/classes/test-mexc";
import { TestBybit, TestOKX } from "@/classes/test-platforms";

export const platforms = {
    binance: TestBinance ,
    bybit: TestBybit ,
    okx: TestOKX ,
    gateio: TestGateio ,
    bitget: TestBitget,
    mexc: TestMexc,
};

 
