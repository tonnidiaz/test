
import { TestBinance } from "@/classes/test-binance";
import { Platform, TestBybit, TestOKX } from "@/classes/test-platforms";

export const platforms: { name: string; obj: Platform }[] = [
    { name: "binance", obj: new TestBinance() },
    { name: "bybit", obj: new TestBybit() },
    { name: "okx", obj: new TestOKX() },
];



