export interface IObj {[key: string] : any}
export interface IError {msg: string, code: number}
export interface IGetData {err?: IError, data?: any}
export interface ISelectItem {label: string, value: any, disabled?: boolean; class?: string; html?: string}
export type TGetData = (...args: any)=> Promise<IGetData>
