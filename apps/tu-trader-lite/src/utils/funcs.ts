import { parseDate } from "@cmn/utils/functions"


export const sayHello = (name: string)=>{console.log(`Hello ${name}.\nIt's ${parseDate(Date.now())}`)}