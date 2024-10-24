// import { clearTerminal } from "@cmn/utils/functions";
const clearTerminal = () => {
    process.stdout.write("\x1Bc");
};

const vue = 
`<div class="my-class">Some stuff</div>
<my-comp class='title'>SOME THING</my-comp>
`
/**
 * w -> word
 */


function fixAttr(attr: string){
    let fields = attr.split(".")
    const method = fields[0]
    fields = fields.filter((_, i)=> i != 0)
    let str = `setValue={v=> set${method}(`
    if (!fields.length) str += "v"
    else if (fields.length == 1){
        str += `{...${method}, ${fields[0]}: v}`
    }else{
        str += fields.join(".")
    }
    str += ")}"

}


const attr = "formState.field"
fixAttr(attr)