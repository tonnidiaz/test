import type { IObj } from "@cmn/utils/interfaces";

export const userStore = $state({
    user: null as  IObj | null,
    bots: [] as IObj[],
})

export const setUser = (v: typeof userStore.user) =>
    (userStore.user = v);
export const setBots = (v: typeof userStore.bots) =>
    (userStore.bots = v);
