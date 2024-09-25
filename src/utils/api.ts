import axios from "axios";
import {DEV} from "./constants"
const BEND_URL = DEV ? 'http://127.0.0.1:5500' : 'https://trader-bend.vercel.app'
export const api = (auth = false) => axios.create({ baseURL: BEND_URL, headers: {},  });
