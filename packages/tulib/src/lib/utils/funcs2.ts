import { Order } from "../models";
import type { IBot } from "../models/bot";
import type { IOrder } from "../models/order";

export const findBotOrders = async (bot: IBot) => {
    const orders = await Order.find({
        bot: bot._id,
        base: bot.base,
        ccy: bot.ccy,
    }).exec();
    return orders;
};

export const getLastOrder = async (bot: IBot) => {
    const orders = await Order.find({ bot: bot.id }).exec();
    return orders.length
        ? await Order.findById([...orders].pop()?.id).exec()
        : null;
};



export const orderHasPos = (order?: IOrder | null) => {
    return order != null && order.side == "sell" && !order.is_closed;
};
export const getBaseToSell = (order: IOrder) => {
    return order.base_amt - order.buy_fee;
};
