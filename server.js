// Servidor de salas para Gem Rush 3D. Solo reenvía mensajes: la partida la ejecuta el navegador del anfitrión.
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,FILE=path.join(__dirname,'gem-rush-3d-multijugador.html');
const cl=s=>String(s||'').slice(0,12);
const srv=http.createServer((q,r)=>{
  if(q.url=='/'||q.url.startsWith('/?')){fs.readFile(FILE,(e,d)=>{
    if(e){r.writeHead(500);return r.end('Falta gem-rush-3d-multijugador.html')}
    r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(d)})}
  else{r.writeHead(404);r.end()}});
const wss=new WebSocketServer({server:srv}),rooms=new Map();
const send=(w,o)=>w.readyState==1&&w.send(JSON.stringify(o));
const list=r=>[...r.c.values()].map(c=>c.info);
const bcast=r=>{const p=list(r);for(const c of r.c.values())send(c.ws,{t:'players',players:p})};
wss.on('connection',ws=>{let room=null,me=null;
  ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}
    if(m.t=='create'&&!room){let code;do{code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('')}while(rooms.has(code));
      room={code,c:new Map(),nid:1};rooms.set(code,room);
      me={id:0,ws,info:{id:0,n:cl(m.n),k:cl(m.k)}};room.c.set(0,me);
      send(ws,{t:'room',code,id:0,host:1,players:list(room)})}
    else if(m.t=='join'&&!room){const r=rooms.get(String(m.code||'').toUpperCase());
      if(!r)return send(ws,{t:'err',m:'Sala no encontrada'});
      if(r.c.size>=6)return send(ws,{t:'err',m:'Sala llena (máx. 6)'});
      room=r;const id=r.nid++;me={id,ws,info:{id,n:cl(m.n),k:cl(m.k)}};r.c.set(id,me);
      send(ws,{t:'room',code:r.code,id,host:0,players:list(r)});bcast(r)}
    else if(!room)return;
    else if(m.t=='info'){const n={id:me.id,n:cl(m.n),k:cl(m.k)};
      if(JSON.stringify(n)!=JSON.stringify(me.info)){me.info=n;bcast(room)}}
    else if(m.t=='up'){const h=room.c.get(0);h&&send(h.ws,{t:'up',from:me.id,d:m.d})}
    else if(m.t=='dn'&&me.id==0){const ex=m.d&&m.d.ex;
      for(const c of room.c.values())if(c.id!=0&&c.id!=ex)send(c.ws,{t:'dn',d:m.d})}});
  ws.on('close',()=>{if(!room||!me)return;room.c.delete(me.id);
    if(me.id==0){for(const c of room.c.values()){send(c.ws,{t:'closed'});c.ws.close()}rooms.delete(room.code)}
    else bcast(room)})});
srv.listen(PORT,()=>console.log('Gem Rush 3D en http://localhost:'+PORT));
