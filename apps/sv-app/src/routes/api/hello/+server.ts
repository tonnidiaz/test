import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = ({url})=>{
    const name = url.searchParams.get("name") || "Anonymous"
    const r = {hello: name}
    return json(r)
}