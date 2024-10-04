export const useUserStore = defineStore("user", {
    state: ()=> ({
        user: null as  IObj | null,
        bots: [] as IObj[],
    }),
    actions: {
        setUser(val : any){
            this.user = val
        },
        setBots(val : any){
            val = val.map(bot=>{
                 const children = val.filter(el=> el.is_child && el.parent == bot._id)
                 console.log({children})
                 return {...bot, children}
            })
               
            this.bots = val.filter(el=> !el.is_child)

        }
    }
})