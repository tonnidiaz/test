import { ceil, clearTerminal, randomInRange } from "@cmn/utils/functions";

const MIN_PERC = 1

function main(){
    clearTerminal()
    let bal = 50
    const START_BAL = bal;

	const pxC2 = 119880.11988011989
	const pxC3 = 179820.17982017985
    const pxC1 = 59941

    const pxA = 60000
    const pxB = 1.001
    let pxC = pxC1; 

    let perc = (pxB * pxC) / pxA

    console.log({perc, bal});
    let quoteA = bal / 3
    bal -= quoteA
    let _amt = bal;
   

    let baseB = _amt / pxA;
     bal -= _amt
    _amt = baseB / 2
    baseB -= _amt

    let baseC = _amt * pxB

    console.log({quoteA, baseB, baseC});

    const len = 2

    for (let i =0; i < len; i++){

        pxC = randomInRange(pxC1, pxC3)
        perc = (pxB * pxC) / pxA
        console.log('\n', {perc: ceil(perc, 2)});

        // Buy baseB
        const _baseB = quoteA / pxA;
        quoteA = 0;

        // Sell old baseB for baseC
        const _baseC = baseB * pxB;
        baseB = 0
        // Add _baseB to baseB
        baseB += _baseB

        // Sell old baseC for quoteA
        const _quoteA = baseC * pxC
        baseC = 0
        baseC += _baseC

        // Add _quoteA to quoteA
        quoteA += _quoteA
    }

    console.log('\nDONE');
    console.log({quoteA, baseB, baseC});

    // sell baseB and baseC
    quoteA += (baseB * pxA)
    quoteA += (baseC * pxC)
    console.log({quoteA});
}

main()

