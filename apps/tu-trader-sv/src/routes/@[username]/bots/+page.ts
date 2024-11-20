import { localApi } from '@cmn/utils/constants.js';
import { error } from '@sveltejs/kit';
import { AxiosError } from 'axios';

export const load = async ({params})=>{
    const {username} = params;
    try{
        const r = await localApi().get("/bots?user=" + username)
        return {bots: r.data, username}
    }
    catch(e){
        if (e instanceof AxiosError){
            error(e.status, e.message)
        }else{
            console.log(e);
            error(500, "Something went wrong")
        }
    }
}