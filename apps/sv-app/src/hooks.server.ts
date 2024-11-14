import { User } from "@cmn/models";
import { __DEV__ } from "@cmn/utils/consts3";
import { connectMongo } from "@cmn/utils/funcs4";
import type { Handle } from "@sveltejs/kit";
async function main(){
    console.log("\nSERVER HOOK\n")
    await connectMongo(__DEV__)
}

main()

export const handle: Handle = async ({ resolve, event }) => {
    console.log("\nSERVER MIDDLEWARE\n");
    return resolve(event);
};
 