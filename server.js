/**
 * MAZE DOOM — Serveur Multijoueur
 * npm install ws && node server.js
 */
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// ─── HTTP : sert le fichier HTML ─────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(path.join(__dirname, 'maze-doom.html'), (err, data) => {
      if (err) { res.writeHead(500); res.end('maze-doom.html introuvable'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404); res.end();
  }
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server });
const rooms = {};
let playerCounter = 0;

const COLORS = ['#ff3333','#33aaff','#33ff66','#ffee33','#ff33dd','#33ffee','#ff8833','#aa33ff'];
let colorIdx = 0;

const SPAWNS = {
  'Bunker':     [{x:1.5,y:1.5},{x:14.5,y:1.5},{x:1.5,y:14.5},{x:14.5,y:14.5},{x:7.5,y:7.5}],
  'Labyrinthe': [{x:1.5,y:1.5},{x:14.5,y:1.5},{x:1.5,y:14.5},{x:14.5,y:14.5}],
  'Arène':      [{x:2.5,y:2.5},{x:13.5,y:2.5},{x:2.5,y:13.5},{x:13.5,y:13.5},{x:7.5,y:2.5},{x:7.5,y:13.5}],
};

function getSpawn(map) {
  const pts = SPAWNS[map] || SPAWNS['Bunker'];
  return { ...pts[Math.floor(Math.random() * pts.length)] };
}

function snapPlayers(room) {
  const o = {};
  for (const [id, p] of Object.entries(room.players))
    o[id] = { id, name:p.name, x:p.x, y:p.y, angle:p.angle, health:p.health, kills:p.kills, color:p.color };
  return o;
}

function broadcast(room, msg, excludeId=null) {
  const s = JSON.stringify(msg);
  for (const [id, p] of Object.entries(room.players))
    if (id !== excludeId && p.ws.readyState === 1)
      try { p.ws.send(s); } catch(e){}
}

wss.on('connection', ws => {
  const pid = 'p' + (++playerCounter);
  let rid = null;
  const send = m => { try { if (ws.readyState===1) ws.send(JSON.stringify(m)); } catch(e){} };

  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'create') {
      const id = Math.random().toString(36).substr(2,5).toUpperCase();
      const color = COLORS[colorIdx++ % COLORS.length];
      const spawn = getSpawn(msg.map);
      rooms[id] = { map: msg.map, players: {}, started: false };
      rooms[id].players[pid] = { ws, name:msg.name||'PLAYER', color, kills:0, health:100, angle:0, ...spawn };
      rid = id;
      send({ type:'joined', pid, rid:id, color, map:msg.map, spawn, players:snapPlayers(rooms[id]) });
    }
    else if (msg.type === 'join') {
      const room = rooms[msg.rid];
      if (!room) { send({ type:'error', msg:'Salle introuvable' }); return; }
      const color = COLORS[colorIdx++ % COLORS.length];
      const spawn = getSpawn(room.map);
      room.players[pid] = { ws, name:msg.name||'PLAYER', color, kills:0, health:100, angle:Math.random()*Math.PI*2, ...spawn };
      rid = msg.rid;
      send({ type:'joined', pid, rid:msg.rid, color, map:room.map, spawn, players:snapPlayers(room) });
      broadcast(room, { type:'player_join', player:{ id:pid, name:msg.name, color, kills:0, health:100, angle:0, ...spawn } }, pid);
    }
    else if (msg.type === 'move') {
      if (!rid||!rooms[rid]) return;
      const p = rooms[rid].players[pid];
      if (p) { p.x=msg.x; p.y=msg.y; p.angle=msg.angle; }
      broadcast(rooms[rid], { type:'move', id:pid, x:msg.x, y:msg.y, angle:msg.angle }, pid);
    }
    else if (msg.type === 'shoot') {
      if (!rid||!rooms[rid]) return;
      broadcast(rooms[rid], { type:'shoot', id:pid }, pid);
    }
    else if (msg.type === 'hit') {
      if (!rid||!rooms[rid]) return;
      const room = rooms[rid];
      const target = room.players[msg.tid];
      if (!target||target.health<=0) return;
      target.health = Math.max(0, target.health - (msg.dmg||25));
      broadcast(room, { type:'player_hit', id:msg.tid, health:target.health }, null);
      if (target.health <= 0) {
        const killer = room.players[pid];
        if (killer) killer.kills++;
        broadcast(room, {
          type:'player_died', id:msg.tid, killerId:pid,
          killerName:killer?.name||'?', targetName:target.name||'?',
          killerKills:killer?.kills||0
        }, null);
        setTimeout(() => {
          if (!rooms[rid]) return;
          const t = rooms[rid]?.players[msg.tid];
          if (!t) return;
          const sp = getSpawn(room.map);
          t.health=100; t.x=sp.x; t.y=sp.y;
          broadcast(rooms[rid], { type:'player_respawn', id:msg.tid, x:sp.x, y:sp.y }, null);
        }, 3000);
      }
    }
    else if (msg.type === 'chat') {
      if (!rid||!rooms[rid]) return;
      const p = rooms[rid].players[pid];
      broadcast(rooms[rid], { type:'chat', name:p?.name||'?', text:(msg.text||'').slice(0,50) }, null);
    }
  });

  ws.on('close', () => {
    if (rid && rooms[rid]) {
      const p = rooms[rid].players[pid];
      broadcast(rooms[rid], { type:'player_left', id:pid, name:p?.name||'?' }, null);
      delete rooms[rid].players[pid];
      if (Object.keys(rooms[rid].players).length === 0) delete rooms[rid];
      rid = null;
    }
  });
  ws.on('error', ()=>{});
});

// Nettoyage des salles vides
setInterval(() => {
  for (const id in rooms)
    if (Object.keys(rooms[id].players).length===0) delete rooms[id];
}, 60000);

server.listen(PORT, () => {
  console.log(`\n🎮  MAZE DOOM — http://localhost:${PORT}`);
  console.log(`📦  Démarrage : npm install ws && node server.js\n`);
});
