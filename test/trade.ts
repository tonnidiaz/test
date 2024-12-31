import { Kucoin } from "@cmn/classes/kucoin";
import { Bot } from "@cmn/models";
import { DEV } from "@cmn/utils/constants";
import { objPlats } from "@cmn/utils/consts2";
import { connectMongo } from "@cmn/utils/funcs4";
import {
    getCoinPrecision,
    getPricePrecision,
    handleErrs,
    parseDate,
    toFixed,
} from "@cmn/utils/functions";
import { placeTrade } from "@cmn/utils/orders/funcs";

async function main() {
    await connectMongo(DEV, "tb");

    const amtC = 9.975043,
        pairC = ["USDC", "USDT"],
        cPxC = 1.0021;
    const _botC = await Bot.findById("6771f149b7e2967a7649577d");
    const platC = new objPlats[_botC.platform](_botC, pairC);
    const resC = await placeTrade({
        amt: amtC,
        ordType: "Market",
        price: cPxC,
        pair: pairC,
        bot: _botC,
        plat: platC,
        side: "sell",
        ts: parseDate(),
        is_child: true,
    });
    console.log({ resC });
}

// main()
async function main2() {
    await connectMongo(DEV, "tb");
    const bot = new Bot({
        name: "TuBot",
        platform: "kucoin",
        base: "AAVE",
        ccy: "USDT",
        demo: false,
    });
    const plat = new objPlats["kucoin"](bot);
    try {
        const buyId = "6773e1d4ed3dd3000710a1b3",
            sellId = "6773e311a36b990007e332e5";
        const buyOrder = {
            id: "6773e1d4ed3dd3000710a1b3",
            fillPx: 314.461,
            fillSz: 0.0047,
            fee: 0.0014779667,
            fillTime: 1735647796238,
            cTime: 1735647700149,
        };

        const fullSellOrder = { id: '6773e311a36b990007e332e5',
            symbol: 'AAVE-USDT',
            opType: 'DEAL',
            type: 'market',
            side: 'sell',
            price: '0',
            size: '0.0032',
            funds: '0',
            dealFunds: '1.0102848',
            dealSize: '0.0032',
            fee: '0.0010102848',
            feeCurrency: 'USDT',
            stp: '',
            stop: '',
            stopTriggered: false,
            stopPrice: '0',
            timeInForce: 'GTC',
            postOnly: false,
            hidden: false,
            iceberg: false,
            visibleSize: '0',
            cancelAfter: 0,
            channel: 'API',
            clientOid: 'tb_ord_1735648016829',
            remark: null,
            tags: 'partner:NODESDK',
            isActive: false,
            cancelExist: false,
            createdAt: 1735648017251,
            tradeType: 'TRADE'
          } 
        const fullBuyOrder = {
            id: '6773e1d4ed3dd3000710a1b3',
            symbol: 'AAVE-USDT',
            opType: 'DEAL',
            type: 'market',
            side: 'buy',
            price: '0',
            size: '0',
            funds: '1.5',
            dealFunds: '1.4779667',
            dealSize: '0.0047',
            fee: '0.0014779667',
            feeCurrency: 'USDT',
            stp: '',
            stop: '',
            stopTriggered: false,
            stopPrice: '0',
            timeInForce: 'GTC',
            postOnly: false,
            hidden: false,
            iceberg: false,
            visibleSize: '0',
            cancelAfter: 0,
            channel: 'API',
            clientOid: 'tb_ord_1735647699782',
            remark: null,
            tags: 'partner:NODESDK',
            isActive: false,
            cancelExist: false,
            createdAt: 1735647700149,
            tradeType: 'TRADE'
          } 
          
          
        const sellOrder = {
            id: "6773e311a36b990007e332e5",
            fillPx: 315.714,
            fillSz: 0.0032,
            fee: 0.0010102848,
            fillTime: 1735648077116,
            cTime: 1735648017251,
        };
        const pxPr = getCoinPrecision(
            [bot.base, bot.ccy],
            "limit",
            bot.platform
        );
        const r = await plat.getOrderbyId(buyId);
        // const r = await plat.placeOrder({ amt: 1.5, side: "buy" });
        // const r = await plat.placeOrder({amt: toFixed(buyOrder.fillSz - buyOrder.fee, pxPr), side: 'sell'})
        console.log(r);
    } catch (e) {
        handleErrs(e);
    }
}

main2();
