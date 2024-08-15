
import { TestBinance } from "@/classes/test-binance";
import { Platform, TestBybit, TestOKX } from "@/classes/test-platforms";

export const platforms = [
    { name: "binance", obj: TestBinance },
    { name: "bybit", obj: TestBybit },
    { name: "okx", obj: TestOKX },
];



