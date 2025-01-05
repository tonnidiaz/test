import { clearTerminal } from "@cmn/utils/functions"

export const GET = () =>{
    clearTerminal()
    return new Response("Cleared")
}