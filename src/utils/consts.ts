
import { TestBinance } from "@/classes/test-binance";
import { TestBitget } from "@/classes/test-bitget";
import { TestGateio } from "@/classes/test-gateio";
import { TestKucoin } from "@/classes/test-kucoin";
import { TestMexc } from "@/classes/test-mexc";
import { Platform, TestBybit, TestOKX } from "@/classes/test-platforms";

export const platforms : {[key: string] : typeof Platform} = {
    binance: TestBinance ,
    bybit: TestBybit ,
    okx: TestOKX ,
    kucoin: TestKucoin ,
    bitget: TestBitget,
    mexc: TestMexc,
};

 
