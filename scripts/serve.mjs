import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const allowed=new Set(['index.html','styles.css','app.js','core.js','data.js','favicon.svg']);
http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';if(!allowed.has(name)){res.writeHead(404);res.end('Not found');return;}const data=await fs.readFile(path.join(root,name));res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
