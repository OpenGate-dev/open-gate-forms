// Fake Shopify store: serves the section, mocks cart + checkout, runs the real /api/brief handler.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import handler from '../api/brief.js';
process.env.RESEND_API_KEY='test'; process.env.ALLOWED_ORIGINS='http://localhost:4321';
const log=[]; globalThis.fetch=async(url,o)=>{log.push({url,body:JSON.parse(o.body)});return{ok:true,json:async()=>({id:'m'}),text:async()=>''}};
let attrs={};
http.createServer(async(req,res)=>{
  if(req.url==='/') { res.setHeader('Content-Type','text/html'); return res.end(readFileSync(new URL('./store-page.html',import.meta.url))); }
  if(req.url==='/cart.js') { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({items:[{product_title:'Apex Focus Store',variant_title:'Art Niche',quantity:1}]})); }
  if(req.url==='/cart/update.js') { let b='';for await(const c of req)b+=c; attrs=JSON.parse(b).attributes; res.setHeader('Content-Type','application/json'); return res.end('{}'); }
  if(req.url==='/checkout') { res.setHeader('Content-Type','text/html'); return res.end('<h1 id="co">CHECKOUT</h1><pre id="attrs">'+JSON.stringify(attrs)+'</pre><pre id="mail">'+JSON.stringify(log.map(l=>({to:l.body.to,subject:l.body.subject,reply:l.body.reply_to})))+'</pre>'); }
  if(req.url==='/api/brief') return handler(req,res);
  res.statusCode=404; res.end();
}).listen(4321,()=>console.log('ready'));
