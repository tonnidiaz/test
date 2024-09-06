import { ceil, clearTerminal, readJson } from "@/utils/functions"

const DEXE_START = "2024-03-05T14:00:00+02:00",
DEXE_END = "2024-03-05T17:00:00+02:00",
GFT_START = "2024-04-14T13:00:00+02:00",
GFT_END = "2024-04-14T15:00:00+02:00"
const A = "USDT", B = "BTC", C = "DEXE"
const symboA = `${B}_${A}`
const symboB = `${C}_${B}`
const symboC = `${C}_${A}`
const aPath = `_data/coin-api/kucoin-spot/orderbook/KUCOIN_SPOT_${symboA}_${DEXE_START.split('T')[0]}_${DEXE_END.split('T')[0]}.json`
const bPath = `_data/coin-api/kucoin-spot/orderbook/KUCOIN_SPOT_${symboB}_${DEXE_START.split('T')[0]}_${DEXE_END.split('T')[0]}.json`
const cPath = `_data/coin-api/kucoin-spot/orderbook/KUCOIN_SPOT_${symboC}_${DEXE_START.split('T')[0]}_${DEXE_END.split('T')[0]}.json`
clearTerminal()
const run = async ()=>{
    let aData = await readJson(aPath)
    let bData = await readJson(bPath)
    let cData = await readJson(cPath)

    
    const interval = 1// secs
    let aTs = aData[0].time_exchange
    let bTs = bData[0].time_exchange
    let cTs = cData[0].time_exchange
    console.log({cTs, bTs, aTs})

    bData = bData.filter(el => Date.parse(el.time_exchange) >= Date.parse(cTs))
    bTs = bData[0].time_exchange
    aData = aData.filter(el => Date.parse(el.time_exchange) >= Date.parse(bTs))

    aTs = aData[0].time_exchange
    bTs = bData[0].time_exchange
    cTs = cData[0].time_exchange


    console.log({cTs, bTs, aTs}, '\n')

    let lastTsA = 0
    let lastTsB = 0
    let lastTsC = 0
    for (let i = 0; i < aData.length; i++){
        
        const book = aData[i]
        const tsA = book.time_exchange
        const tsB = book.time_exchange
        const tsC = book.time_exchange

        const tsMsA = Date.parse(tsA)
        const tsMsB = Date.parse(tsB)
        const tsMsC = Date.parse(tsC)

        const tsCond = 
        tsMsA >= lastTsA + interval * 1000 &&
        tsMsB >= lastTsB + interval * 1000 &&
        tsMsC >= lastTsC + interval * 1000
        
        const rowA = aData[i]
        const rowB = bData[i]
        const rowC = cData[i]
        if (!rowA || !rowB || !rowC) continue
        const askA = rowA.asks[0].price
        const bidA = rowA.bids[0].price
        const askB = rowB.asks[0].price
        const bidB = rowB.bids[0].price
        const askC = rowC.asks[0].price
        const bidC = rowC.bids[0].price

        if (tsCond){
           
            lastTsA = tsMsA
            lastTsB = tsMsB
            lastTsC = tsMsC
            const fA2 = (bidB * bidA) / askC
            const A2 = (bidC) / (askA * askB)
            const fperc = ceil((fA2 - 1) / 100, 10)
            const perc = ceil((A2 - 1) / 100, 10)

            if (perc < 0 && fperc <0) continue
            console.log('\n', {tsA, tsB, tsC})
            console.log({fperc: `${fperc}%`, fA2})
            console.log({perc: `${perc}%`, A2})
        }
    }
}

run()