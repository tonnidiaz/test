import { IObj } from "@cmn/utils/interfaces";
import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
    name: "user",
    initialState: {
        user: null as (IObj | null),
        bots: [] as IObj[]
    },
    reducers: {
        setUser: (state, {payload}) =>{
            state.user = payload
        },
        setBots: (state, {payload: val}) =>{
            val = val.map(bot=>{
                const children = val.filter(el=> el.is_child && el.parent == bot._id)
                console.log({children})
                return {...bot, children}
           })
           state.bots = val.filter(el=> !el.is_child)
        }
    }
})

export const {setUser, setBots} = userSlice.actions
export default userSlice.reducer