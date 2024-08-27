import { IBot } from "@/models/bot";
import { botLog, getCoinPrecision, getMinAmt, getMinSz, getPricePrecision } from "../functions";
import { objPlats } from "../consts2";
import { getAmtToBuyWith, getExactDate, getLastOrder, orderHasPos, parseKlines } from "../funcs2";

export const afterOrderUpdateArbit = async ({bot} : {bot: IBot}) =>{
    try{
        const pairA = [bot.B, bot.A], pairB = [bot.C, bot.B], pairC = [bot.C, bot.A];
        const platName = bot.platform.toLowerCase()
        const plat = new objPlats[platName]()
        
        const pxPrA = getPricePrecision(pairA, platName);
            const basePrA = getCoinPrecision(pairA, "limit", platName);

            const pxPrB = getPricePrecision(pairB, platName);
            const basePrB = getCoinPrecision(pairB, "limit", platName);

            const pxPrC = getPricePrecision(pairC, platName);
            const basePrC = getCoinPrecision(pairC, "limit", platName);

            const minAmtA = getMinAmt(pairA, platName),
                minSzA = getMinSz(pairA, platName);
            const minAmtB = getMinAmt(pairB, platName),
                minSzB = getMinSz(pairB, platName);
            const minAmtC = getMinAmt(pairC, platName),
                minSzC = getMinSz(pairC, platName);

            if (
                pxPrA == null ||
                basePrA == null ||
                pxPrB == null ||
                basePrB == null ||
                pxPrC == null ||
                basePrC == null ||
                minAmtA == null ||
                minSzA == null ||
                minAmtB == null ||
                minSzB == null ||
                minAmtC == null ||
                minSzC == null
            ) {
               return botLog(bot, "CANNOT GET PRECISION OR MIN/MAX AMT/SZ FOR ONE OF THE PAIRS")
            }


            botLog(bot, "GETTING KLINES FOR EACH PAIR...\n")
            const end = getExactDate(bot.interval)
            
            const ksA = await plat.getKlines({end: end.getTime(), pair: pairA})
            if (!ksA){
                return botLog(bot, "FAILED TO GET KLINES FOR", pairA)
            }
            const ksB = await plat.getKlines({end: end.getTime(), pair: pairB})
            if (!ksB){
                return botLog(bot, "FAILED TO GET KLINES FOR", pairB)
            }
            const ksC = await plat.getKlines({end: end.getTime(), pair: pairC})
            if (!ksC){
                return botLog(bot, "FAILED TO GET KLINES FOR", pairC)
            }

            let dfA = parseKlines(ksA);
            let dfB = parseKlines(ksB);
            let dfC = parseKlines(ksC);

            const rowA = dfA[0];
                const rowB = dfB[0];
                const rowC = dfC[0];

                const pxA = rowA.o;
                const pxB = rowB.o;
                const pxC = rowC.o;
                const ts = rowA.ts;

                if (rowB.ts != ts || rowC.ts != ts) {
                    return botLog(bot, "TIMESTAMPS DO NOT MATCH");
                }
                console.log("\n", { ts });

                let _quote = 0,
                    baseA = 0,
                    baseB = 0;
                let perc = 0;

                const AMT = 1
                baseA = AMT / pxA
                baseB = baseA / pxB
                _quote = baseB * pxC

                perc = Number(((_quote - AMT) / AMT * 100).toFixed(2))

                botLog(bot, {perc: `${perc}%`, baseA, baseB})

                if (perc >= bot.min_arbit_perc){
                    console.log({pairA, pairB, pairC})
                    botLog(bot, "GOING IN...")
                    let order = await getLastOrder(bot);
                    let pos = orderHasPos(order);

                    const bal = getAmtToBuyWith(bot, order )
                    baseA = bal / pxA;
                    if (baseA < minSzA || bal < minAmtA) {
                        botLog(bot, "CANNOT BUY A: LESS THAN MIN_AMT", {
                            baseA,
                            minSzA,
                            amtA: bal,
                            minAmtA,
                        });
                        return;
                    }

                    baseB = baseA / pxB;
                    if (baseB < minSzB || baseA < minAmtB) {
                        botLog(bot, "CANNOT BUY B: LESS THAN MIN_AMT", {
                            baseB,
                            minSzB,
                            amtB: baseA,
                            minAmtB,
                        });
                        return;
                    }

                    _quote = baseB * pxC;
                    if (baseB < minSzC || _quote < minAmtC) {
                        botLog(bot, "CANNOT SELL C: LESS THAN MIN_AMT", {
                            baseC: baseB,
                            minSzC,
                            amtC: _quote,
                            minAmtC,
                        });
                        return;
                    }
                }
    }
    catch(e){
        botLog(bot, e)
    }
}