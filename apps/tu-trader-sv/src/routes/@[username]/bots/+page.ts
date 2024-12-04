import { localApi } from '@/lib/api';
import { API_URL } from '@/lib/constants.js';
import { error } from '@sveltejs/kit';
import { AxiosError } from 'axios';

export const load = async ({params, url})=>{
    const {username} = params;
    try{
        console.log({username,});
        const r = await localApi().get(url.origin + "/api/bots?user=" + username)
        console.log(r.data?.length);
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