import { capitalizeFirstLetter } from "@cmn/utils/functions";
import type { RequestHandler } from "./$types";

function fixAttr(attr: string) {
    console.log("Fixing partial code...")
    attr = attr.trim();
    if (attr.startsWith("{{") && attr.endsWith("}}")) {
        attr = attr.replace("{{", "{").replace("}}", "}");
        return attr;
    }
    let attrName = attr.split("=")[0];

    if (attrName == "v-model") {
        const val = attr.split("=")[1].replaceAll("'", "").replaceAll('"', "");
        let fields = val.split(".");
        const method = fields[0];
        fields = fields.filter((_, i) => i != 0);
        let str = `bind:value={${val}}`;
        // if (!fields.length) str += "v"
        // else if (fields.length == 1){
        //     str += `{...${method}, ${fields[0]}: v}`
        // }else{
        //     str += fields.join(".")
        // }
        // str += ")}"
        //     attr = `value={${val}} ${str}`//setValue={set${capitalizeFirstLetter(val)}}`
        attr = str;
        return attr;
    }
    const firstCommaIndex = attr.indexOf("=") + 1;
    const stringCommas = attr[firstCommaIndex];
    const lastCommaIndex = attr.lastIndexOf(stringCommas);
    const code = attr.slice(firstCommaIndex + 1, lastCommaIndex);

    if (attrName.startsWith(":")) {
        attrName = attrName.replace(":", "");
    } else if (attrName.startsWith("@")) {
        attrName = attrName.replace("@", "");
        attrName = "on" + attrName;
    }
    attr = `${attrName}={${code}}`;
    return attr;
}

function fixFullCode(code: string) {
    console.log("Fixing full code...")
    code = code
        .replace(/<template>/g, "")
        .replace(/<\/template>/g, "")

        // Replace <script lang="ts" setup> section
        .replace(/<script lang="ts" setup>/g, '<script lang="ts">')
        .replace(/<\/script>/g, "")

        // Convert Vue reactivity
        .replace(/ref\(([^)]+)\)/g, "writable($1)")
        .replace(/const ([^ ]+) = ref\(([^)]+)\)/g, "const $1 = writable($2)")
        .replace(/onMounted\(/g, "onMount(")

        // Replace `store` state management
        .replace(/store\.([^()]+)\(\)/g, "$1()")
        .replace(/store\.(\w+)/g, "$$$1")

        // Replace Vue's template expressions
        .replace(/@click/g, "on:click");
// replace(/@click="([^"]+)"/g, "onclick={$1}")
    // Add reactive variable prefix
    code = code.replace(/\{\{\s*([^}]+)\s*\}\}/g, "{$$1}");
    return code;
}

const selectTag = (code: string)=>{
    const regex0 = /(\w+)="([^"]*)"/g
    const regex = /(\w+)(?:\s*=\s*["']([^"']*)["'])?/g
    const regexWithTags = /<(\w+)\b[^>]*\s(\w+)(?:\s*=\s*["']([^"']*)["'])?/g
    const regexWithTags2 = /<(\w+)\b[^>]*\s(\w+)(?:\s*=\s*["']([^"']*)["'])?/g
    let tags = code.matchAll(regexWithTags2);
    [...tags].forEach(t=>{
        let tag = t[0]
        console.log({tag})
        let attrs = tag.matchAll(regex)
        for (let attr of attrs){
            console.log({attr: attr[0]})
        }
    })
    return tags
}

export const POST: RequestHandler = async ({ request }) => {
    const { code, full } = await request.json();
    console.log(selectTag(code))
    return new Response(full ? fixFullCode(code): fixAttr(code));
};
