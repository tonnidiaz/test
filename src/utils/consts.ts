
import { TestBinance } from "@/classes/test-binance";
import { TestBitget } from "@/classes/test-bitget";
import { TestGateio } from "@/classes/test-gateio";
import { TestBybit, TestOKX } from "@/classes/test-platforms";

export const platforms = [
    { name: "binance", obj: TestBinance },
    { name: "bybit", obj: TestBybit },
    { name: "okx", obj: TestOKX },
    { name: "gateio", obj: TestGateio },
    { name: "bitget", obj: TestBitget},
];



