import {binance, phemex} from 'ccxt'

export class Phemex{
    client: phemex
    constructor(){
        this.client = new phemex()
    }

    async getKlines(){
        //const res = await this.client.get
    }
}