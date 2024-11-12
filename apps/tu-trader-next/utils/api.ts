import axios from "axios";
import { API_URL, BEND_URL, STORAGE_KEYS } from "./constants";
console.log({API_URL})
export const api = (auth = false) =>
    axios.create({
        baseURL: BEND_URL,
        headers: {
            Authorization: auth
                ? `Bearer ${localStorage.getItem(STORAGE_KEYS.authTkn)}`
                : null,
            "Content-Type": "application/json",
        },
    });
export const localApi = (auth = false) =>
    {
        console.log({API_URL})
        return axios.create({
        baseURL: API_URL,
        headers: {
            Authorization: auth
                ? `Bearer ${localStorage.getItem(STORAGE_KEYS.authTkn)}`
                : null,
            "Content-Type": "application/json",
        },
    })}
