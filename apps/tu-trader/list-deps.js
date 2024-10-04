import json from "./package.json" with {type: 'json'}
console.log(json);
const deps = `npm i ${Object.keys(json.dependencies).join(' ')}`
const devDeps = `npm i ${Object.keys(json.devDependencies).join(' ')}`

console.log({deps, devDeps})