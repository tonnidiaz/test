import { TestBinance } from "@cmn/classes/test-binance";
import { TestBitget } from "@cmn/classes/test-bitget";
import { TestKucoin } from "@cmn/classes/test-kucoin";
import { TestMexc } from "@cmn/classes/test-mexc";
import { TestPlatform, TestBybit, TestOKX } from "@cmn/classes/test-platforms";
import { parentStrategies } from "@cmn/strategies";


export const test_platforms : {[key: string] : typeof TestPlatform} = {
    binance: TestBinance ,
    bybit: TestBybit ,
    okx: TestOKX ,
    kucoin: TestKucoin ,
    bitget: TestBitget,
    mexc: TestMexc,
};

export const _plats = Object.keys(test_platforms)