import { data } from "@/data/data";
import { strategy } from "@/strategies/funcs";
import { IObj } from "@/utils/interfaces";

export class Strategy {
    name: string = "";
    desc: string = "";

    buyCond(...args: any): boolean {
        return false;
    }
    sellCond(row: IObj, entry?: number, df?: IObj[], i?: number): boolean {
        return false;
    }
    run({
        df, 
        balance,
        lev = 1,
        pair,
        maker,
        taker,
    }: {
        df: IObj[];
        balance: number;
        lev?: number;
        pGain?: number;
        maker: number;
        taker: number;
        pair: string[];
    }) {
        console.log(
            `\nRunning ${this.name} strategy [${this.desc}] \t ${pair}\n`
        );
        const mData = strategy({
            df,
            //stdDf,
            balance,
            buyCond: this.buyCond,
            sellCond: this.sellCond,
            pair,
            lev,
            maker,
            taker,
        });
        return mData;
    }

    toJson() {
        let o = {};
        for (let k of Object.keys(this)) {
            o[k] = this[k];
        }
        return o;
    }
}
