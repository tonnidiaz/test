import type { IObj } from "@cmn/utils/interfaces";
import { writable } from "svelte/store";

export const appStore = writable({
    strategies: [] as IObj[],
    platforms: [] as string[],
    parents: [] as string[],
    ready: false,
    cnt: 0
})

export const setCnt = (v: number) =>{
    appStore.update(n=>({...n, cnt: v}))
}