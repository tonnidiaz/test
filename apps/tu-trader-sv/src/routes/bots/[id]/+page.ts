import { localApi } from "@/lib/api";
import { handleErrs } from "@cmn/utils/functions";
import { error } from "@sveltejs/kit";
import { AxiosError } from "axios";

export const load = async ({params, url}) =>{
    try {
        
        const root = url.origin
        const {id} = params
         const r = await localApi().get(root + "/api/bots/" + id);
         return {bot: r.data}
    } catch (err) {
        handleErrs(err)
        let status: number | undefined;
        let msg: string | undefined;
        if (err instanceof AxiosError){
            status = err.status
            msg = err.response.data
        }
        error(status || 500, msg || "Something went wrong")
    }
}