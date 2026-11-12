import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');await fs.mkdir(dist,{recursive:true});
for(const name of ['index.html','styles.css','app.js','core.js','data.js','favicon.svg'])await fs.copyFile(path.join(root,name),path.join(dist,name));
await fs.cp(path.join(root,'assets'),path.join(dist,'assets'),{recursive:true});
await fs.writeFile(path.join(dist,'.nojekyll'),'');

// A self-contained companion also opens directly from disk, without a server.
const read=name=>fs.readFile(path.join(root,name),'utf8');
const [html,css,data,core,app,favicon]=await Promise.all(['index.html','styles.css','data.js','core.js','app.js','favicon.svg'].map(read));
let embeddedCSS=css;
for(const name of ['LINESeedSansTH_Rg.ttf','LINESeedSansTH_Bd.ttf']){
 const bytes=await fs.readFile(path.join(root,'assets','fonts',name));
 embeddedCSS=embeddedCSS.replaceAll('assets/fonts/'+name,'data:font/ttf;base64,'+bytes.toString('base64'));
}
const fontLicense=await read('assets/fonts/OFL.txt');
const script='(()=>{\n'+data.replace(/^export /gm,'')+'\n'+core.replace(/^export /gm,'')+'\nconst esc=escapeHTML;\n'+app.replace(/^import .*;\n/gm,'')+'\n})();';
new vm.Script(script,{filename:'preview.html'});
const standalone=html
 .replace('<link rel="icon" href="favicon.svg" type="image/svg+xml">','<link rel="icon" href="data:image/svg+xml;base64,'+Buffer.from(favicon).toString('base64')+'" type="image/svg+xml">')
 .replace(/<link rel="preload"[^>]+>/g,'')
 .replace('<link rel="stylesheet" href="styles.css">','<style>/* LINE Seed Sans TH font license:\n'+fontLicense+'*/\n'+embeddedCSS.replace(/<\/style/gi,'<\\/style')+'</style>')
 .replace('<script type="module" src="app.js"></script>','')
 .replace('</body>','<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>\n</body>');
await fs.writeFile(path.join(root,'preview.html'),standalone);
await fs.writeFile(path.join(dist,'preview.html'),standalone);
console.log('Built static site in dist/ and self-contained preview.html');
