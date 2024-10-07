import path from "path";
import fs, { rmSync } from "fs";

process.stdout.write('\x1Bc');
// const srcDir = path.join(__dirname); // Replace with the path to your src folder
// const indexFilePath = path.join(srcDir, 'index.js');

function getAllTSFiles(dir, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTSFiles(filePath, fileList);
    } else if (path.extname(file) === '.js') {
        if (file !== 'index.js')
      fileList.push(filePath);
    else 
        fileList.push(filePath)
    }
  });

  return fileList;
}

function generateExports() {
const srcDir = process.argv[2]
if (!srcDir) return console.log('Provide src directory');
console.log({srcDir});
  const tsFiles = getAllTSFiles(srcDir);
  const exportLines = tsFiles.map(file => {
    const relativePath = `./${path.relative(srcDir, file).replace(/\\/g, '/')}`;
    rmSync(file, {recursive: true, force: true})
    return file//`export * from '${relativePath.replace('.js', '')}';`;
  });

//   fs.writeFileSync(indexFilePath, exportLines.join('\n'), 'utf-8');
console.log(exportLines.join('\n'))
//   console.log(`Generated ${indexFilePath}`);
}

generateExports();
