const v = {
    symbol: 'PEOPLEUSDT',
    orderType: 'Market',
    orderLinkId: '1702558606639238401',
    slLimitPrice: '0',
    orderId: '1702558606639238400',
    cancelType: 'UNKNOWN',
    avgPrice: '0.12079',
    stopOrderType: '',
    lastPriceOnCreated: '',
    orderStatus: 'Filled',
    takeProfit: '0',
    cumExecValue: '50.0000000',
    smpType: 'None',
    triggerDirection: 0,
    blockTradeId: '',
    isLeverage: '0',
    rejectReason: 'EC_NoError',
    price: '0',
    orderIv: '',
    createdTime: '1717696801916',
    tpTriggerBy: '',
    positionIdx: 0,
    trailingPercentage: '0',
    timeInForce: 'IOC',
    leavesValue: '0.0000000',
    basePrice: '0.12079',
    updatedTime: '1717696801917',
    side: 'Buy',
    smpGroup: 0,
    triggerPrice: '0.00000',
    tpLimitPrice: '0',
    trailingValue: '0',
    cumExecFee: '0.413941551452934845',
    leavesQty: '0.00',
    slTriggerBy: '',
    closeOnTrigger: false,
    placeType: '',
    cumExecQty: '413.94',
    reduceOnly: false,
    activationPrice: '0',
    qty: '50.0000000',
    stopLoss: '0',
    marketUnit: 'quoteCoin',
    smpOrderId: '',
    triggerBy: ''
  }
  function precision(a) {
    if (!isFinite(a)) return 0;
    var e = 1, p = 0;
    while (Math.round(a * e) / e !== a) { e *= 10; p++; }
    return p;
  }

class T{
    sayHi(name){
        console.log(`Hello ${name}`);
    }
}

function m(bal, date){
function mult(bal){
    return [bal * 4, new Date().toISOString()]
}
console.log(bal, date);
for (let i of [1,2,3,4,5]){
    [bal, date] = mult(bal)
console.log(bal, date);
console.log('\n');
}

}

m(10, 'now')
