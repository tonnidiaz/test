import { ceil } from "@/utils/functions"

const run = () =>{
    let pxA = 1.006
    let pxB = .2445
    let pxC = 0.2559
    const A = 1

    pxA *= (1 + .5/100)
    pxB *= (1 + .5/100)
    pxC *= (1 - .5/100)
    const A2 = (pxC) / (pxA * pxB)
    const perc = ceil((A2 - A)/A*100, 2)
    console.log({A2, perc})
}

run()