const path = require("path");
const { existsSync, mkdirSync, writeFileSync } = require("fs");

const ensureDirExists = (filePath) => {
    var dirname = path.dirname(filePath);
    if (existsSync(dirname)) {
        return true;
    }
    ensureDirExists(dirname);
    console.log("Creating directory");
    mkdirSync(dirname);
};

function main() {
    process.stdout.write("\x1Bc");
    console.log("Express(Ts) generator from Tu!!\n");
    let dir = process.argv[2];
    if (!dir) return console.log("Please specify appname or directory!!");
    dir = path.resolve(dir);
    const appName = [...dir.split("/")].pop();
    console.log({ appName });
    ensureDirExists(dir);
    console.log("\nGenerating files...");
    let filename = "package.json"
    const json = {
        name: appName,
        version: "0.0.0",
        private: true,
        scripts: {
            build: "tsc",
            start: "node dist/index.js",
            dev: "tsx watch src/index.ts",
        },
        devDependencies: {
            "tsx": "*", "ts-node": "*", "typescript": "*"
        }
    };
console.log(filename);
writeFileSync(path.join(dir, filename), JSON.stringify(json))

}

main();
