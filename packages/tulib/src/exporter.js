const fs = require('fs');
const path = require('path');
process.stdout.write('\x1Bc');
const srcDir = path.join(__dirname); // Replace with the path to your src folder
const indexFilePath = path.join(srcDir, 'index.ts');

function getAllTSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTSFiles(filePath, fileList);
    } else if (path.extname(file) === '.ts' && !file.includes('.spec') && !file.toLocaleLowerCase().includes('copy')) {
        if (file !== 'index.ts')
      fileList.push(filePath);
    else 
        fileList.push(filePath.replace('/index', ''))
    }
  });

  return fileList;
}

function generateExports() {
  const tsFiles = getAllTSFiles(srcDir);
  const exportLines = tsFiles.map(file => {
    const relativePath = `./${path.relative(srcDir, file).replace(/\\/g, '/')}`;
    return `export * from '${relativePath.replace('.ts', '')}';`;
  });

//   fs.writeFileSync(indexFilePath, exportLines.join('\n'), 'utf-8');
console.log(exportLines.join('\n'))
//   console.log(`Generated ${indexFilePath}`);
}

generateExports();
