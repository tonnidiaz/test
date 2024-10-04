export const useAppStore = defineStore("app", {
    state: ()=>({
        strategies: [] as IObj[],
        platforms: [] as string[],
        parents: [] as string[],
        ready: false,
        path: '' as string
    }),

    actions: {
        setReady(val: typeof this.ready){this.ready = val},
        setStrategies(val: typeof this.strategies){this.strategies = val},
        setPlatforms(val: typeof this.platforms){this.platforms = val},
        setParents(val: typeof this.parents){this.parents = val},
        setPath(val: typeof this.path){this.path = val},
    }
})