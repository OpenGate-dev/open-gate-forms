import http from 'node:http';
import { readFileSync } from 'node:fs';
import handler from '../api/withdrawal.js';
process.env.RESEND_API_KEY='test'; process.env.ALLOWED_ORIGINS='http://localhost:4322';
globalThis.fetch=async(url,o)=>{console.log('MAIL', JSON.parse(o.body).to, JSON.parse(o.body).subject);return{ok:true,json:async()=>({id:'m'}),text:async()=>''}};
http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(readFileSync(new URL('./wd-page.html',import.meta.url)));}
  if(req.url==='/api/withdrawal') return handler(req,res);
  res.statusCode=404;res.end();
}).listen(4322,()=>console.log('ready'));
