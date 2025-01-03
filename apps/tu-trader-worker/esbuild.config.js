// import { build } from "esbuild";
import { build } from "esbuild";
import copy from 'esbuild-plugin-copy'
build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    resolveExtensions: [".js", ".ts"],
    format: "esm",
    packages: "external",
    outfile: 'dist/bundle.js',
    plugins: [
        copy({
            resolveFrom: 'cwd',
            assets: {
              from: ['../../packages/common/src/utils/data/**/*'],
              to: ['./dist/data'],
            },
          }),
    ]
  }).then((r)=>{console.log('App built');}).catch(() => process.exit(1));