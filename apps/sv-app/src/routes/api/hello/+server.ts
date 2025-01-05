import { json } from "@sveltejs/kit"
import { meta } from "@ts/utils/bend/conts"

export const GET = () =>{
    return json({meta})
}