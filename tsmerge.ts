/**
 * Assing the base-config to a new var newJson
 * Go through the child-config and change common fields in newJson if they're non-object
 * If field is json:
 *      invoke a json parser func and assign the ret val to the field
 * fn jsonParser({key, val: Obj}){
 *      //
 * }
 */
import {
  existsSync,
  readdir,
  readdirSync,
  readFileSync,
  watchFile,
  writeFileSync,
} from 'fs';
import path from 'path';

process.stdout.write('\x1Bc');

function readJson(fp: string) {
  try {
    if (!existsSync(fp)) return console.log(`Err: ${fp} does not exist!!`);
    const str = readFileSync(fp, 'utf-8');
    const fn = '(function(){return ( ' + str + ' ) })()';
    const r = eval(fn);

    return r;
  } catch (e) {
    console.log(e);
  }
}

interface IObj {
  [k: string]: any;
}

/**
 * Values of these fields are paths to files or folders
 */
const pathsKeys = [
  'tsBuildInfoFile',
  'baseUrl',
  'paths',
  'rootDir',
  'outDir',
  'outFile',
  'sourceRoot',
  'mapRoot',
  'declarationDir',
  'references',
  'include',
  'exclude',
  'files',
];
const parentJson = {
  extends: './tsconfig.base.json',
  compilerOptions: {
    module: 'ESNext',
    target: 'ESNext',
    outDir: '../../dist/out-tsc',
    declaration: true,
    types: ['node'],
    baseUrl: './',
    paths: {
      '@base/*': ['../base/src/lib/*'],
      '@fonts/*': ['../fonts/src/lib/*'],
    },
  },
  exclude: [
    'base_jest.config.ts',
    'base_src/**/*.spec.ts',
    'base_src/**/*.test.ts',
    '../base_common/src/**/*.spec.ts',
  ],
  include: ['base_src/**/*.ts', '../base_common/src/**/*.ts'],
};
const json = {
  extends: './tsconfig.json',
  child: true,
  compilerOptions: {
    declaration: false,
    types: ['py'],
    baseUrl: './child-base',
    paths: {
      '@common/*': ['../common/src/lib/*'],
      '@obj': {
        k: ['val', 'val2', 'val3', 'val4'],
      },
    },
  },
  exclude: [
    'jest.config.ts',
    'src/**/*.spec.ts',
    'src/**/*.test.ts',
    '../common/src/**/*.spec.ts',
  ],
  include: ['src/**/*.ts', '../common/src/**/*.ts'],
};

let basePath = '';
let rootDir = '';

/**
 *
 * @param basePath is the path to the base-config file
 * @returns old config with paths relative to curr dir
 */
const resPath = ({ p, basePath }: { basePath: string; p: string }) => {
  basePath = path.resolve(basePath);
  const __dir = path.dirname(basePath);
  const _p = path.resolve(__dir, p);
  rootDir = path.resolve('.');

  return path.relative(rootDir, _p);
};

/**
 * Parses the base config paths
 *
 */
const jsonParser = ({ key, obj }: { key: string; obj: object }) => {
  //   console.log({ key });
  if (Array.isArray(obj))
    obj = obj.map((el) =>
      typeof el == 'string' && pathsKeys.includes(key)
        ? resPath({ p: el, basePath })
        : el
    );
  else {
    // Parse json
    for (let k of Object.keys(obj)) {
      let v = obj[k];
      //   console.log({ key: k });

      if (typeof v == 'object')
        v = jsonParser({ key: pathsKeys.includes(key) ? key : k, obj: v });
      else
        v =
          typeof v == 'string' && pathsKeys.includes(k)
            ? resPath({ p: v, basePath })
            : v;
      obj[k] = v;
    }
  }
  return obj;
};

const isArray = (v: object) => Array.isArray(v);
const mainFunc = ({
  baseJson,
  childJson,
}: {
  baseJson: IObj;
  childJson: IObj;
}) => {
  let newJson: IObj = baseJson;

  //   Deal with base config
  for (let k of Object.keys(newJson)) {
    let v = newJson[k];
    v = jsonParser({ key: k, obj: v });
    newJson[k] = v;
  }

  const parseJsons = (obj1: any, obj2: any) => {
    // Assign obj2 fields to obj1 fields
    if (obj2 == null) return obj1
    if (typeof obj2 == 'object') {
      if (isArray(obj2)) {
        obj1 = [...(obj1 ?? []), ...obj2]
      } else {
        for (let k of Object.keys(obj2)) {
          let v = obj2[k];
          if (!obj1) continue
           let baseV = obj1[k];
          if (typeof v == 'object') {
            if (isArray(v)) v = [...(baseV ?? []), ...v];
            else v = parseJsons(baseV ?? {}, v);
          }
          obj1[k] = v;
        }
      }
    } else obj1 = obj2;
    return obj1;
  };
  //   Deal with child config
  for (let k of Object.keys(childJson)) {
    let v = childJson[k];
    const baseVal = newJson[k];

    // if (typeof v == 'object') {
    //   if (isArray(v)) v = [...(baseVal ?? []), ...v];
    //   else v = 'object';
    // }
    newJson[k] = parseJsons(baseVal, v);
  }
  writeFileSync('tsconfig.json', JSON.stringify(newJson));
  console.log('\nDone!!\n');
};

let live = false;
const main = () => {
  const filename = 'tsconfig.ref.json';
  const _live = live;
  live = true;
  if (!_live) {
    rootDir = process.argv[2];
    console.log({ dir: rootDir });
    if (!rootDir)
      return console.log(
        `Err: please specify the directory of the tsconfig file`
      );
    process.chdir(rootDir);
  }

  const childJson = readJson(filename);
  if (!childJson) return console.log('Err: No json!!');

  if (!_live) {
    console.log('\n[TS] watching config file...\n');
    watchFile(filename, async (e) => {
      console.log('[TS] config file changed');
      main();
    });
  }

  basePath = childJson.extends;
  const baseJson = basePath ? readJson(basePath) ?? {} : {};
  if (!_live && basePath) {
    console.log('\n[TS] watching base config file...\n');
    watchFile(basePath, async (e) => {
      console.log('[TS] Base config file changed');
      main();
    });
  }
  mainFunc({ baseJson, childJson });
};

main();
