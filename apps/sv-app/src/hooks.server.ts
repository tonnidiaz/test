import { User } from "@cmn/models";
import { __DEV__ } from "@cmn/utils/consts3";
import { connectMongo } from "@cmn/utils/funcs4";
async function main(){
    console.log("\nSERVER HOOK\n")
    await connectMongo(__DEV__)
}

main()