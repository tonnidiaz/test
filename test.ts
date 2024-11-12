// import { clearTerminal } from "@cmn/utils/functions";
const clearTerminal = () => {
    process.stdout.write("\x1Bc");
};

const code = ``

function convert(code: string){
    code = code.replace(/@click="([^"]+)"/g, /onclick=$1/)
}