import $ from "jquery";
import { api, localApi } from "./api";
import { IObj } from "@cmn/utils/interfaces";
export const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
});

export function openDrawer() {
    const drawer = $(".drawer");
    drawer.addClass("open");
}


export const activateBot = async (el: any, bot: IObj, updateBot?: any) => {
    try {
        el.innerHTML = `<span class="loading loading-dots loading-sm m-auto"></span>`;
        //await sleep(100000000000)
        //return false
        const val = !bot.active;
        const res = await api(true).post(`/bots/${bot._id ?? bot.id}/edit`, {
            key: "active",
            val: val,
        });
        if (updateBot) updateBot(res.data);
        el.innerHTML = `<span>${
            res.data.active ? "Deactivate" : "Activate"
        }</span>`;
        return true;
    } catch (err) {
        console.log(err);
        el.innerHTML = `<span>${bot.active ? "Deactivate" : "Activate"}</span>`;
        return false;
    }
};
export const clearBotOrders = async (el: any, bot: IObj, updateBot?: any) => {
    const conf = confirm("ARE YOU SURE YOU WANT TO CLEAR ORDERS FOR BOT [" + bot.name + "] ?")
    if (!conf) return true
    const defHtml = el.innerHTML
    try {
        console.log(el, bot);
        el.innerHTML = `<span class="loading loading-dots loading-sm m-auto"></span>`;
        const res = await localApi(true).post(`/bots/${bot._id}/clear-orders`);

        if (updateBot) updateBot(res.data);
        el.innerHTML = defHtml
        return true;
    } catch (err) {
        console.log(err);
        el.innerHTML = defHtml
        return false;
    }
};
export const delBot = async (el: any, bot: IObj, updateBot?: any) => {
    const conf = confirm("ARE YOU SURE YOU WANT TO DELETE THIS BOT [" + bot.name + "] ?")
    if (!conf) return true
    const defHtml = el.innerHTML
    try {
        console.log(el, bot);
        el.innerHTML = `<span class="loading loading-dots loading-sm m-auto"></span>`;
        const res = await localApi(true).post(`/bots/${bot._id}/delete`);

        if (updateBot) updateBot(res.data);
        el.innerHTML = defHtml
        return true;
    } catch (err) {
        console.log(err);
        el.innerHTML = defHtml
        return false;
    }
};

export const toSelectStrategies = (strategies: IObj[]) =>
    strategies.map((e, i) => ({
        label: e.name,
        value: i + 1,
    }));

interface IMetaProps {
    title?: string;
    src?: string;
    desc?: string;
    url?: string;
    keywords?: string;
}



export const isValidDate = function(date: string) {
    return (new Date(date) .toString()!== "Invalid Date") && !isNaN(Date.parse(date));
}
  
export function numToWords(number: number | string){
      //Validates the number input and makes it a string
   
    if (typeof number === 'number' && isFinite(number)) {
        number = number.toString(10);
    } else {
        return 'This is not a valid number';
    }

    //Creates an array with the number's digits and
    //adds the necessary amount of 0 to make it fully 
    //divisible by 3
    var digits = number.split('');
    while (digits.length % 3 !== 0) {
        digits.unshift('0');
    }

    //Groups the digits in groups of three
    var digitsGroup: any[] = [];
    var numberOfGroups = digits.length / 3;
    for (var i = 0; i < numberOfGroups; i++) {
        digitsGroup[i] = digits.splice(0, 3);
    }
   
    //Change the group's numerical values to text
    var digitsGroupLen = digitsGroup.length;
    var numTxt = [
        [null, 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'], //hundreds
        [null, 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'], //tens
        [null, 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] //ones
        ];
    var tenthsDifferent = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    // j maps the groups in the digitsGroup
    // k maps the element's position in the group to the numTxt equivalent
    // k values: 0 = hundreds, 1 = tens, 2 = ones
    for (var j = 0; j < digitsGroupLen; j++) {
        for (var k = 0; k < 3; k++) {
            var currentValue = digitsGroup[j][k];
            digitsGroup[j][k] = numTxt[k]![currentValue];
            if (k === 0 && currentValue !== '0') { // !==0 avoids creating a string "null hundred"
                digitsGroup[j][k] += ' hundred ';
            } else if (k === 1 && currentValue === '1') { //Changes the value in the tens place and erases the value in the ones place
                digitsGroup[j][k] = tenthsDifferent[digitsGroup[j][2]];
                digitsGroup[j][2] = 0; //Sets to null. Because it sets the next k to be evaluated, setting this to null doesn't work.
            }
        }
    }

     //Adds '-' for gramar, cleans all null values, joins the group's elements into a string
    for (var l = 0; l < digitsGroupLen; l++) {
        if (digitsGroup[l][1] && digitsGroup[l][2]) {
            digitsGroup[l][1] += '-';
        }
        digitsGroup[l].filter(function (e) {return e !== null});
        digitsGroup[l] = digitsGroup[l].join('');
    }

    //Adds thousand, millions, billion and etc to the respective string.
    var posfix = [null, 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion'];
    if (digitsGroupLen > 1) {
        var posfixRange = posfix.splice(0, digitsGroupLen).reverse();
        for (var m = 0; m < digitsGroupLen - 1; m++) { //'-1' prevents adding a null posfix to the last group
            if (digitsGroup[m]) {
                digitsGroup[m] += ' ' + posfixRange[m];
            }
        }
    }

    //Joins all the string into one and returns it
    return digitsGroup.join(' ');
}
export const listToOpt  = (lst: string[]) => lst.map(el=>({label: el.toUpperCase(), value: el})) 
