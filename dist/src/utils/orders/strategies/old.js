"use strict";
// if (!order || !pos){
//             botLog(bot, "KAYA RA BUY")
//            const { o, ts } = row;
//             const entry = o
//             botLog(bot, `MARKET BUY ORDER AT ${o}`)
//             const amt = order ? order.new_ccy_amt - Math.abs(order.sell_fee) : bot.start_bal;
//             const r = await placeTrade({
//                 bot: bot,
//                 ts: parseDate(new Date()),
//                 amt,
//                 side: "buy",
//                 price: 0 /* 0 for market buy */,
//                 plat: plat,
//                 ordType: 'Market'
//             });
//             if (!r){
//               return   botLog(bot, "FAILED TO PLACE BUY ORDER")
//             }
//             order = (await Order.findById(r).exec())!
//             pos = true
//             if (!isGreen){
//                 console.log("SKIPING...")
//                 return
//             }
//         }
//         if (pos && order) {
//             const TP = 5,
//                 SL = 1.2,
//                 TRAIL = 0.1;
//             const entry = order.buy_price;
//             const tp = ceil(o * (1 + TP / 100), pxPr);
//             const trail = ceil(prevRow.h * (1 - TRAIL / 100), pxPr);
//             const sl = ceil(entry * (1 - SL / 100), pxPr);
//             let exit = 0;
//             let _base = order.base_amt - order.buy_fee;
//             if (o >= trail && isGreen) {
//                 timedLog("OPEN > TRAIL");
//                 exit = o;
//                 if (o < entry) _base /= 2
//                 else if (!isGreen) _base /= 3
//             }
//             _base = toFixed(_base, basePrecision)
//             botLog(bot, {_base})
//             if (exit != 0 && exit >= sl) {
//                 timedLog("PLACING SELL ORDER AT OPEN", { volume: row.v, exit });
//                 const amt = _base
//                 const r = await placeTrade({
//                     bot: bot,
//                     ts: parseDate(new Date()),
//                     amt: Number(amt),
//                     side: "sell",
//                     plat: plat,
//                     price: exit,
//                     ordType: "Market"
//                 });
//                 if (!r){return timedLog("COULD NOT PLACE SELL ORDER")}
//                 botLog(bot, "SELL ORDER PLACED")
//             }
//         }
