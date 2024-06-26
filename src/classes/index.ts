import { IBot } from "@/models/bot";
import { TestBinance } from "./test-binance";
import { Order } from "@/models";
import { cancelJob, rescheduleJob } from "node-schedule";
import { getJob, placeTrade, updateOrder } from "@/utils/orders/funcs";
import {
    calcEntryPrice,
    calcSL,
    calcTP,
    chandelierExit,
    heikinAshi,
    parseDate,
    parseKlines,
} from "@/utils/funcs2";

import { objStrategies, strategies } from "@/strategies";
import { IOrder } from "@/models/order";
import {
    P_DIFF,
    botJobSpecs,
    isStopOrder,
    slPercent,
    test,
} from "@/utils/constants";
import { botLog, getCoinPrecision } from "@/utils/functions";
import { Bybit } from "./bybit";
import { OKX } from "./okx";

export class OrderPlacer {
    cnt: number = 0;
    lastCheckAt?: Date;
    bot: IBot;
    plat: Bybit | OKX;

    constructor(bot: IBot) {
        this.bot = bot;
        this.plat = bot.platform == "bybit" ? new Bybit(bot) : new OKX(bot);
    }

    async checkPlaceOrder() {
        try {
            const now = new Date();
            const currMin = now.getMinutes();

            const mTest =
                test &&
                (
                    await Order.find({
                        bot: this.bot._id,
                        base: this.bot.base,
                        ccy: this.bot.ccy,
                    }).exec()
                ).length <= 4;

            if (test || true)
                console.log(
                    `[ ${this.bot.name} ]\tCURR_MIN: [${currMin}]\tTEST: ${mTest}\n`
                );

            const prodTimeCond =
                this.bot.active &&
                currMin % this.bot.interval == 0 &&
                (this.lastCheckAt
                    ? `${this.lastCheckAt?.getHours()}:${this.lastCheckAt?.getMinutes()}` !=
                      `${now.getHours()}:${now.getMinutes()}`
                    : true);

            if (mTest || prodTimeCond) {
                this.lastCheckAt = new Date();
                cancelJob(getJob(this.bot._id.toString())!.job);

                const botOrders = await Order.find({
                    bot: this.bot._id,
                    base: this.bot.base,
                    ccy: this.bot.ccy,
                }).exec();
                const res = await updateOrder(this.bot, botOrders);
                const job = getJob(`${this.bot._id}`)!;
                if (res && res != "ok" && job.active) {
                    const { isClosed, lastOrder } = res;

                    const klines = await this.plat.getKlines({
                        end: Date.now() - this.bot.interval * 60 * 1000,
                    });

                    if (!klines) return console.log("FAILED TO GET KLINES");

                    const df = chandelierExit(
                        heikinAshi(parseKlines(klines), [
                            this.bot.base,
                            this.bot.ccy,
                        ])
                    );

                    console.log(`\n[${this.bot.name}]\tCHECKING SIGNALS...\n`);
                    const currentCandle = df[df.length - 1];
                    const ts = new Date(
                        Date.parse(currentCandle.ts) +
                            this.bot.interval * 60 * 1000
                    ).toISOString();
                    botLog(
                        this.bot,
                        `this.bot.strategy = ${this.bot.strategy}, isClosed: ${isClosed} `
                    );
                    const strategy = objStrategies[this.bot.strategy - 1];
                    botLog(this.bot, "STRATEGY:");
                    console.log(strategy);
                    console.log(currentCandle);

                    if (
                        (isClosed || !lastOrder) &&
                        (strategy.buyCond(currentCandle) || mTest)
                    ) {
                        // Place buy order
                        console.log(
                            `[ ${this.bot.name} ]\tHAS BUY SIGNAL > GOING IN`
                        );
                        /* Same as new balance */
                        const orders = await Order.find({
                            bot: this.bot._id,
                            base: this.bot.base,
                            ccy: this.bot.ccy,
                        }).exec();
                        const _lastOrder = orders.length
                            ? orders[orders.length - 1]
                            : null;
                        const amt = _lastOrder
                            ? _lastOrder.new_ccy_amt -
                              Math.abs(_lastOrder.sell_fee)
                            : this.bot.start_amt;

                        const entryLimit = calcEntryPrice(currentCandle, "buy");
                        console.log({
                            c: currentCandle.c,
                            o: currentCandle.o,
                            P_DIFF,
                            entryLimit,
                        });
                        const res = await placeTrade({
                            bot: this.bot,
                            ts: parseDate(ts),
                            amt,
                            side: "buy",
                            price: entryLimit,
                            plat: this.plat,
                        });
                    } else if (
                        !isClosed &&
                        lastOrder?.side == "sell" &&
                        lastOrder?.order_id == ""
                    ) {
                        if (isStopOrder || strategy.sellCond(currentCandle)) {
                            /**
                             * Place sell order
                             */
                            const exitLimit = calcTP(
                                currentCandle,
                                lastOrder.buy_price
                            );
                            const sl = calcSL(lastOrder.buy_price);
                            console.log({
                                c: currentCandle.c,
                                o: currentCandle.o,
                                entry: lastOrder.buy_price,
                                exitLimit,
                                sl,
                            });

                            const orders = await Order.find({
                                bot: this.bot._id,
                                base: this.bot.base,
                                ccy: this.bot.ccy,
                            }).exec();
                            const _lastOrder = orders.length
                                ? orders[orders.length - 1]
                                : null;
                            if (_lastOrder) {
                                console.log(
                                    `[ ${this.bot.name} ]\tHAS SELL SIGNAL > GOING OUT`
                                );
                                const amt =
                                    _lastOrder.base_amt - _lastOrder.buy_fee;
                                const res = await placeTrade({
                                    bot: this.bot,
                                    ts: parseDate(ts),
                                    amt: Number(amt),
                                    side: "sell",
                                    price: exitLimit,
                                    plat: this.plat,
                                    sl
                                });
                            }
                        }
                    }
                } else if (res == "ok") {
                    botLog(this.bot, "Order cancelled");
                } else {
                    botLog(this.bot, "Failed to update order");
                    return;
                }
                if (job.active) {
                    rescheduleJob(job.job, botJobSpecs(this.bot.interval));
                    botLog(this.bot, "JOB RESUMED");
                }
            }
        } catch (err) {
            console.log(err);
        }
    }
}
