import axios from "axios";
import { API_URL, BEND_URL, STORAGE_KEYS } from "./constants";
console.log({API_URL})
export const api = (auth = false) =>{
    const _axios = axios.create({
        baseURL: BEND_URL,
        headers: {
            Authorization: auth
                ? `Bearer ${localStorage.getItem(STORAGE_KEYS.authTkn)}`
                : null,
            "Content-Type": "application/json",
        },
    })
    _axios.interceptors.response.use(config=>{
        config.data = config.data || {}
        return config
    })
return _axios
};
    
    ;
export const localApi = (auth = false) =>
    {
        console.log({API_URL})
        const _axios = axios.create({
        baseURL: API_URL,
        headers: {
            Authorization: auth
                ? `Bearer ${localStorage.getItem(STORAGE_KEYS.authTkn)}`
                : null,
            "Content-Type": "application/json",
        },
    });
    _axios.interceptors.response.use(config=>{
        config.data = config.data || {}
        return config
    })
    return _axios
}
