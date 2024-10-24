import { IObj } from "@cmn/utils/interfaces";
import { createSlice } from "@reduxjs/toolkit";

const appSlice = createSlice({
    name: "app",
    initialState: {
        strategies: [] as IObj[],
        platforms: [] as string[],
        parents: [] as string[],
        ready: false,
        path: '' as string
    },
    reducers: {
        setStrategies: (state, {payload}) =>{
            state.strategies = payload
        },
        setPlatforms: (state, {payload}) =>{
            state.platforms = payload
        },
        setParents: (state, {payload}) =>{
            state.parents = payload
        },
        setReady: (state, {payload})=>{
            state.ready = payload
        }
    }
})

export const {setParents, setPlatforms, setReady, setStrategies} = appSlice.actions
export default appSlice.reducer