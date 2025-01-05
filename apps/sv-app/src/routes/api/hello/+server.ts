import { json } from "@sveltejs/kit"
import { getData, meta } from "@ts/utils/bend/conts"

export const GET = () =>{
    return json({meta, data: getData()})
}