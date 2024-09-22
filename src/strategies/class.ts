import {
    MAKER_FEE_RATE,
    PUT_ASIDE,
    SELL_AT_LAST_BUY,
    SL,
    TAKER_FEE_RATE,
    TP,
} from "@/utils/constants";
import { ICandle, IObj } from "@/utils/interfaces";
import { fillBuyOrder, fillSellOrder } from "./utils/functions";
import {
    getCoinPrecision,
    getMaxAmt,
    getMaxSz,
    getMinSz,
    getPricePrecision,
    sleep,
    toFixed,
} from "@/utils/functions";

export class Backtest {
    pos = false;
    cnt = 0;
    gain = 0;
    loss = 0;
    buyFees = 0;
    sellFees = 0;
    lastPx = 0;

    mData: IObj = { data: [] };
    _data: IObj = {};

    entry: number = 0;
    entryLimit: number | null = null;
    exitLimit: number | null = null;
    tp: number | null = null;
    base: number = 0;
    sl: number | null = null;
    exit: number = 0;
    enterTs = "";
    pricePrecision: number;
    minSz: number;
    maxSz: number;
    maxAmt: number;
    basePrecision: number;
    quote = "";
    aside = 0;
    START_BAL = 0;
    balance = 0;
    maker = 0;
    taker = 0;
    row: ICandle;
    prevrow: ICandle;
    buyrow: ICandle;
    isGreen = false;
    isYellow = false;
    isSl = false;
    df: ICandle[] = [];
    pair: string[] = [];
    sell_order_filled = false;
    buy_order_filled = false;
    amt_bought = 0;
    zero_vols = 0;
    amt_sold = 0;

    name = "Backtester";
    buyCond: (row: ICandle, df?: ICandle[], i?: number) => boolean;
    sellCond: (
        row: ICandle,
        entry: number,
        df?: ICandle[],
        i?: number
    ) => boolean;

    constructor({
        df,
        balance,
        buyCond,
        sellCond,
        lev = 1,
        pair,
        maker = MAKER_FEE_RATE,
        taker = TAKER_FEE_RATE,
        trades,
        platNm,
    }: {
        df: ICandle[];
        balance: number;
        buyCond: (row: ICandle, df?: ICandle[], i?: number) => boolean;
        sellCond: (
            row: ICandle,
            entry: number,
            df?: ICandle[],
            i?: number
        ) => boolean;
        pair: string[];
        maker: number;
        taker: number;
        lev?: number;
        trades: IObj[];
        platNm: string;
    }) {
        console.log("\nPARENT:", this.constructor.name);
        this.balance = balance;
        this.START_BAL = balance;
        this.df = df;
        this.buyCond = buyCond;
        this.sellCond = sellCond;
        this.maker = maker;
        this.taker = taker;
        this.pair = pair;
        this.quote = pair[1];

        const _pricePrecision = getPricePrecision(pair, platNm);
        const _minSz = getMinSz(pair, platNm);
        const _maxSz = getMaxSz(pair, platNm);
        const _maxAmt = getMaxAmt(pair, platNm);
        const _basePrecision = getCoinPrecision(pair, "limit", platNm);

        this.pricePrecision = _pricePrecision!;
        this.basePrecision = _basePrecision!;
        this.minSz = _minSz!;
        this.maxSz = _maxSz!;
        this.maxAmt = _maxAmt!;

        this.row = df[1];
        this.buyrow = df[1];
        this.prevrow = df[0];
    }

    putAside(amt: number) {
        if (!PUT_ASIDE) return;
        this.balance -= amt;
        this.aside += amt;
        this.START_BAL = this.balance;
    }

    _fillSellOrder(ret: ReturnType<typeof fillSellOrder>) {
        (this.pos = ret.pos),
            (this.mData = ret.mData),
            (this.sl = ret.sl),
            (this.tp = ret.tp),
            (this.entryLimit = ret.entryLimit),
            (this.cnt = ret.cnt),
            (this.gain = ret.gain),
            (this.loss = ret.loss);
        this.sellFees += ret.fee;
        this.exitLimit = null;
        this.entryLimit = null;
        this.balance += ret.balance;
        const profitPerc =
            ((this.balance - this.START_BAL) / this.START_BAL) * 100;
        if (profitPerc >= 100) {
            this.putAside(this.balance / 2.5);
        }
    }

    _fillBuyOrder(ret: ReturnType<typeof fillBuyOrder>) {
        if (
            this.maxSz == null ||
            this.minSz == null ||
            this.pricePrecision == null ||
            this.basePrecision == null
        )
            return;
        (this.pos = ret.pos), (this.mData = ret.mData);
        this.buyFees += ret.fee;
        this.tp = toFixed(this.entry * (1 + TP / 100), this.pricePrecision!);
        this.sl = toFixed(this.entry * (1 - SL / 100), this.pricePrecision!);
        this.base += ret.base;
    }

    _fillSell({
        _exit,
        _base,
        _row,
        isSl,
    }: {
        _exit: number;
        _row: ICandle;
        _base: number;
        isSl?: boolean;
    }) {
        console.log("\nSELLING", { _base, _exit }, "\n");
        if (
            this.maxSz == null ||
            this.minSz == null ||
            this.pricePrecision == null ||
            this.basePrecision == null
        )
            return;

        const _bal = _base * _exit;
        if (_bal < 1)
            if (_bal > this.maxAmt!) {
                console.log(`BAL ${_bal} > MAX_AMT ${this.maxAmt}`);
                _base = (this.maxAmt! * (1 - 0.5 / 100)) / _exit;
                _base = toFixed(_base, this.basePrecision!);
                return this._fillSell({ _exit, _base, _row, isSl });
            }
        const ret = fillSellOrder({
            exitLimit: this.exitLimit,
            exit: _exit,
            prevrow: _row,
            entry: this.entry,
            base: _base,
            pricePrecision: this.pricePrecision,
            enterTs: this.enterTs,
            gain: this.gain,
            loss: this.loss,
            cnt: this.cnt,
            mData: this.mData,
            pos: this.pos,
            sl: this.sl,
            tp: this.tp,
            entryLimit: this.entryLimit,
            maker: this.maker,
            isSl,
        });

        this._fillSellOrder(ret);
        this.base -= _base;
        this.sell_order_filled = false;

        console.log(
            `\nAFTER SELL: bal = ${this.balance}, base = ${this.base}\n`
        );
    }

    _fillBuy({
        amt,
        _entry,
        _row,
    }: {
        amt: number;
        _entry: number;
        _row: ICandle;
    }) {
        console.log("BUYING", { amt, _entry }, "\n");
        if (
            this.maxSz == null ||
            this.minSz == null ||
            this.pricePrecision == null ||
            this.basePrecision == null
        )
            return;
        const _base = amt / _entry;
        if (_base < this.minSz) {
            const msg = `BASE: ${_base} < MIN_SZ: ${this.minSz}`;
            return console.log(`${msg}`);
        } else if (_base > this.maxSz!) {
            const msg = `BASE: ${_base} > MAX_SZ: ${this.maxSz}`;

            console.log(`${msg}\n`);

            amt = this.maxSz * (1 - 0.5 / 100) * _entry;
            amt = toFixed(amt, this.pricePrecision);
            return this._fillBuy({ amt, _entry, _row });
        }
        if (!this.entryLimit) this.entryLimit = this.entry;
        const ret = fillBuyOrder({
            entry: _entry,
            prevrow: _row,
            entryLimit: this.entryLimit,
            enterTs: this.enterTs,
            taker: this.taker,
            balance: amt,
            basePrecision: this.basePrecision,
            mData: { ...this.mData },
            pos: this.pos,
        });
        this._fillBuyOrder(ret);
        this.balance -= amt;
        this.buy_order_filled = false;
        console.log(
            `\nAFTER BUY: bal = ${this.balance}, base = ${this.base}\n`
        );
        this.buyrow = _row;
    }

    _checkOrders() {
        console.log("CHECKING PREVIOUS LIMIT ORDERS...");

        if (this.buy_order_filled && !this.pos && this.amt_bought != 0) {
            console.log("LIMIT BUY ORDER FILLED");
            this._fillBuy({
                amt: this.amt_bought,
                _entry: this.entry,
                _row: this.prevrow,
            });
            this.amt_bought = 0;
        } else if (this.sell_order_filled && this.pos && this.amt_sold != 0) {
            console.log("LIMIT SELL ORDER FILLED");
            this._fillSell({
                _base: this.amt_sold,
                _exit: this.exit,
                _row: this.prevrow,
                isSl: this.isSl,
            });
            this.amt_sold = 0;
        }
    }

    async run() {
        console.log(this.name, ": BEGIN BACKTESTING...\n");
        console.log({ pxPr: this.pricePrecision, basePr: this.basePrecision });
        for (let i = 1; i < this.df.length; i++) {
            //await sleep(0.0000001)
            this.prevrow = this.df[i - 1];
            this.row = this.df[i];
            this.lastPx = this.row.o;

            this.isGreen = this.prevrow.c >= this.prevrow.o;
            this.isYellow = this.prevrow.c > this.row.o;
            console.log(
                "\n",
                {
                    ts: this.row.ts,
                    o: this.row.o,
                    h: this.row.h,
                    l: this.row.l,
                    c: this.row.c,
                    v: this.row.v,
                },
                "\n"
            );

            this._checkOrders();
            const { o } = this.row;
            if (this.row.v == 0){
                this.zero_vols += 1
            }
            if (this.prevrow.v == 0 
                // && this.row.v == 0
                ) {
                    // continue

                }
            this.inloop({ i });
        }
        const oKeys = Object.keys(this.mData.data);
        const lastPos = this.mData.data[oKeys[oKeys.length - 1]];

        if (lastPos && lastPos.side.startsWith("buy")) {
            console.log("ENDED WITH BUY");

            const _row = SELL_AT_LAST_BUY
                ? this.buyrow
                : this.df[this.df.length - 1];
            const _exit = SELL_AT_LAST_BUY ? lastPos._c : _row!.o;
            this._fillSell({
                _row: _row!,
                _exit,
                _base: this.base,
                isSl: true,
            });
        }

        console.log("\n", {
            balance: this.balance,
            aside: this.aside,
            base: this.base,
        });

        this.gain = Number(((this.gain / this.cnt) * 100).toFixed(2));
        this.loss = Number(((this.loss / this.cnt) * 100).toFixed(2));
        this._data = {
            ...this.mData,
            balance: this.balance,
            trades: this.cnt,
            gain: this.gain,
            loss: this.loss,
            aside: this.aside,
        };

        console.log(`\nBUY_FEES: ${this.quote} ${this.buyFees}`);
        console.log({
            minSz: this.minSz,
            maxSz: this.maxSz,
            maxAmt: this.maxAmt,
            zero_vols: this.zero_vols
        });

        console.log(`SELL_FEES: ${this.quote} ${this.sellFees}\n`);

        return this._data;
    }

    inloop({ i }: { i: number }) {}
}
