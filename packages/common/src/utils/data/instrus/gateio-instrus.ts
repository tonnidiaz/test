import { readJson } from "@cmn/utils/bend/functions"
import { instrusRootDir } from "@cmn/utils/constants"

const instru = {
        id: "0DOG_USDT",
        base: "0DOG",
        quote: "USDT",
        fee: "0.2",
        min_base_amount: "0.01",
        min_quote_amount: "3",
        max_quote_amount: "5000000",
        amount_precision: 2,
        precision: 5,
        trade_status: "sellable",
        sell_start: 1607313600,
        buy_start: 1724238000,
    }


    type Instru = typeof instru

    export const gateioInstrus: Instru[] =  readJson(instrusRootDir + "/gateio-instrus.json")
    