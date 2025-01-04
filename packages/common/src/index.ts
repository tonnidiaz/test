import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

let _filename = typeof __filename == "undefined" ? undefined : __filename
if (!_filename){
    _filename = fileURLToPath(import.meta.url)
}
export const currentFilePath = dirname(realpathSync(
    _filename) )
