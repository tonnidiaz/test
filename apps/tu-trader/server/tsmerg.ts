import { readFileSync, writeFileSync } from "fs";
import path from 'path'

process.stdout.write("\x1Bc");
const pth = "tsconfig.ref.json";
function readJson(fp: string) {
    const str = readFileSync(fp, "utf-8")
        .split("\n")
        .filter((el) => !el.trim().startsWith("/"))
        .join("\n");
    return JSON.parse(str);
}
const customConfig = readJson(pth);

const basePath = customConfig.extends;
const baseConfig = readJson(basePath);
console.log({ basePath });

const resPath = (p: string) =>{
   return path.relative('.', path.resolve(path.dirname(basePath), p))
}

const adjustedBasePaths : {[x: string]: string[]} = {};
for (const key in baseConfig.compilerOptions.paths) {
  adjustedBasePaths[key] = baseConfig.compilerOptions.paths[key].map(p =>
    resPath(p)
  );
}

const adjBaseIncludes :string[]= []
for (let pth of baseConfig.include ?? []){
    adjBaseIncludes.push(resPath(pth))
}
const adjBaseExcludes :string[]= []
for (let pth of baseConfig.exclude ?? []){
    adjBaseExcludes.push(resPath(pth))
}

const mergedPaths = {...adjustedBasePaths, ...customConfig.compilerOptions.paths ?? {}}
const mergedIncludes = [...adjBaseIncludes, ...customConfig.include ?? []]
const mergedExcludes = [...adjBaseExcludes, ...customConfig.exclude ?? []]

const mergedConfig = {
    ...customConfig,
    compilerOptions: {
        ...customConfig.compilerOptions,
        //   lib: [...new Set([...baseConfig.compilerOptions.lib, ...customConfig.compilerOptions.lib])],
        paths: mergedPaths
    },
  
    include: mergedIncludes,
    exclude: mergedExcludes,
};
// console.log(mergedConfig);
writeFileSync(pth.replace('.ref', ''), JSON.stringify(mergedConfig, null, 2))
console.log("MERDED!!\n")
