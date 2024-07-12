import { demo } from '@/utils/constants';
import {binance, bybit, phemex} from 'ccxt'

export class Phemex{
    client: bybit
    constructor(){
        const apiKey = demo
            ? process.env.BYBIT_API_KEY_DEV!
            : process.env.BYBIT_API_KEY!;
        const apiSecret = demo
            ? process.env.BYBIT_API_SECRET_DEV!
            : process.env.BYBIT_API_SECRET!;
        this.client = new bybit({apiKey, secret:apiSecret, demotrading: demo})
        this.client.enableDemoTrading (true)
    }

    async getKlines(){
        //const res = await this.client.get
    }

    async getTrades (){
        try{const res = await this.client.privateGetV5ExecutionList({
            symbol: "TRIBEUSDT",
            category: 'linear'})

        console.log(res);}catch(e){
            console.log(e);
        }
    }

}