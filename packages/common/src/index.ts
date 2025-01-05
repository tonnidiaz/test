import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

let _filename = fileURLToPath(import.meta.url)


export const currentFilePath = dirname(realpathSync(
    _filename) )
