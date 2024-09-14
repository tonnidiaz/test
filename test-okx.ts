import { objPlats } from "./src/utils/consts2";
import { Bot, Order, User } from "@/models";
import { ensureDirExists } from "./src/utils/orders/funcs";
import { writeFileSync } from "fs";
import { clearTerminal, getSymbol } from "./src/utils/functions";
import { binanceInfo } from "./src/utils/binance-info";
import { binanceInstrus } from "./src/utils/data/instrus/binance-instrus";
import { Platform } from "@/classes/platforms";
import { TPlatName } from "@/utils/interfaces";

async function getCurrencies() {
    clearTerminal();
    const bot = new Bot({
        name: "TBOT",
        base: "THETA",
        ccy: "USDT",
        platform: "bybit",
        demo: false,
    });
    try {
        const plat = new objPlats[bot.platform](bot);
        const res = await plat.getCurrencies();
        const savePath = `_data/currencies/${bot.platform}.json`;
        ensureDirExists(savePath);
        writeFileSync(savePath, JSON.stringify(res));
        console.log("DONE");
        return res;
    } catch (e) {
        console.log(e);
    }
}

//getCurrencies()

const getMinAmt = (pair: string[], plat: TPlatName) => {
    let amt = 0;
    const ccy = getSymbol(pair, plat);
    switch (plat) {
        case "binance":
            const s1 = binanceInstrus.find((el) => el.symbol == ccy);
            if (!s1) break;
            amt = Number(
                s1.filters.find((el) => el.filterType == "NOTIONAL")!.minNotional
            );
    }
    console.log(amt);
};

//getMinAmt(["SC", "USDT"], "binance")
const getOrderBook = async (pair: string[], plat: string) => {
    const bot = new Bot({
        name: "TBOT",
        interval: 5,
        base: pair[0],
        ccy: pair[1],
        platform: plat,
    });

    const Plat: Platform = new objPlats[plat](bot);
    const ob = await Plat.getOrderbook();
    console.log(ob);
};

getOrderBook(["SUSHI", "USDT"], "bybit");
