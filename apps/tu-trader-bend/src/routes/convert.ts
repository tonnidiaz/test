import { capitalizeFirstLetter } from "@cmn/utils/functions";
import { Router } from "express";

const router = Router();

function fixAttr(attr: string) {
    attr = attr.trim();
    if (attr.startsWith("{{") && attr.endsWith("}}")){
        attr = attr.replace("{{", "{").replace("}}", "}")
        return attr
    }
    let attrName = attr.split("=")[0];

    if (attrName == "v-model"){
        const val = attr.split("=")[1].replaceAll("'", '').replaceAll('"', "")
        let fields = val.split(".")
    const method = fields[0]
    fields = fields.filter((_, i)=> i != 0)
    let str = `setValue={v=> set${capitalizeFirstLetter(method)}(`
    if (!fields.length) str += "v"
    else if (fields.length == 1){
        str += `{...${method}, ${fields[0]}: v}`
    }else{
        str += fields.join(".")
    }
    str += ")}"
        attr = `value={${val}} ${str}`//setValue={set${capitalizeFirstLetter(val)}}`
        return attr
    }
    const firstCommaIndex = attr.indexOf("=") + 1;
    const stringCommas = attr[firstCommaIndex];
    const lastCommaIndex = attr.lastIndexOf(stringCommas);
    const code = attr.slice(firstCommaIndex + 1, lastCommaIndex);

    if (attrName.startsWith(":")) {
        attrName = attrName.replace(":", "");
    }else if (attrName.startsWith("@")){
        attrName = attrName.replace("@", "");
        const firstChar = attrName.charAt(0)
        attrName = "on" +  attrName.replace(firstChar, firstChar.toUpperCase())
    }
    attr = `${attrName}={${code}}`;
    return attr;
}

router.post("/vue-to-jsx", (req, res) => {
    const { code } = req.body;
    const newCode = fixAttr(code);
    res.send(newCode);
});

export default router;
