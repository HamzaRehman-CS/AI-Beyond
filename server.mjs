import http from 'node:http';
import {readFile,mkdir,appendFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost:3000');
  if(url.pathname==='/api/join'&&req.method==='POST'){
   if(req.headers.origin&&!['http://localhost:3000','http://127.0.0.1:3000'].includes(req.headers.origin)){res.writeHead(403);return res.end();}
   let body='';for await(const c of req){body+=c;if(body.length>4096){res.writeHead(413);return res.end();}}
   let input;try{input=JSON.parse(body)}catch{res.writeHead(400);return res.end('Invalid request')}
   if(typeof input.email!=='string'||!/^\S+@\S+\.\S+$/.test(input.email)||input.email.length>254){res.writeHead(400);return res.end('Please enter a valid email.');}
   await mkdir('data',{recursive:true});await appendFile('data/join.jsonl',JSON.stringify({email:input.email,name:String(input.name||'').slice(0,100),interest:String(input.interest||'Neural').slice(0,50),createdAt:new Date().toISOString()})+'\n');
   res.writeHead(201,{'Content-Type':'application/json'});return res.end('{"ok":true}');
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500);res.end(e.code==='ENOENT'?'Not found':'Unable to process this request.');}
}).listen(3000,'127.0.0.1',()=>console.log('Superconscious is running at http://localhost:3000'));
