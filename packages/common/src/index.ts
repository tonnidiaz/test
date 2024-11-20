import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const _filename = typeof __filename == "undefined" ? undefined : __filename

export const currentFilePath = dirname(realpathSync(_filename || fileURLToPath(import.meta.url)) )
