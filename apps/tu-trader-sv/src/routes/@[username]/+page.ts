import { error } from "@sveltejs/kit";

export const load = ({params})=>{
    console.log({params});
    const {username} = params as any
    if (username == "tonnidiaz") return {
        age: 23, name: username
    }
    error(404, "User not found")
}