import { Routes } from '@angular/router';
import { AboutComponent } from './pages/about/about.component';
import { readdirSync } from 'node:fs';
import path, { dirname } from 'node:path';
// declare global {
//     interface NodeRequire {
//         /** A special feature supported by webpack's compiler that allows you to get all matching modules starting from some base directory.  */
//         context: (
//             directory: string,
//             useSubdirectories: boolean,
//             regExp: RegExp
//         ) => any;
//     }
// } 
export const routes: Routes = [
    // {path: 'about', component: AboutComponent}
];
const pagesContext = require.context('./pages', true, /\.component\.ts$/);
console.log(readdirSync('.'));
pagesContext.keys().forEach((pagePath: string) => {
    console.log({pagePath});
  const componentName = pagePath.split('/').pop()?.replace('.component.ts', '');
  
  if (componentName) {
    const component = require(`./pages/${componentName}.component`).default;
    routes.push({ path: componentName.toLowerCase(), component });
  }
});

const genRoutes = (folder = "pages") =>{
    // console.log('\nGenerating routes...');
    // try{
    //     const dir = path.resolve()
    //     console.log(dir);
    //     const files = readdirSync(dir)
    // console.log({files});

    // }
    // catch(e){
    //     console.log('Failed to generate routes');
    //     console.log(e);
    // }
}
genRoutes()