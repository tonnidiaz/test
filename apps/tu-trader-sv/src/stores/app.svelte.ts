import type { IObj } from "@cmn/utils/interfaces";

export const appStore = $state({
    strategies: [] as IObj[],
    platforms: [] as string[],
    parents: [] as string[],
    ready: false,
    cnt: 0,
});

export const setStrategies = (v: typeof appStore.strategies) =>
    (appStore.strategies = v);
export const setPlatforms = (v: typeof appStore.platforms) =>
    (appStore.platforms = v);

export const setParents = (v: typeof appStore.parents) =>
    (appStore.parents = v);
export const setReady = (v: typeof appStore.ready) =>
    (appStore.ready = v);

